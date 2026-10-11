import type { Env } from "./env";

export const DEFAULT_PREFERENCES = { messages: true, playdates: true, community: false };
export type PreferenceKind = keyof typeof DEFAULT_PREFERENCES;
export const TOPICS = ["Parenting", "Activities", "General", "Local"];
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function coarseLocation(latitude: unknown, longitude: unknown) {
  if (typeof latitude !== "number" || typeof longitude !== "number" || !Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) throw new Error("Invalid coordinates");
  return { latitude: Math.round(latitude * 100) / 100, longitude: Math.round(longitude * 100) / 100 };
}
export function distanceKm(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }) {
  const rad = (n: number) => n * Math.PI / 180;
  const s = Math.sin(rad(b.latitude - a.latitude) / 2) ** 2 + Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(rad(b.longitude - a.longitude) / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(Math.max(0, 1 - s)));
}
export function publicFamily(family: Record<string, any>) {
  // Never return account email, diagnosis, private notes, or submitted evidence.
  const { id, parent_name, avatar_url, location, bio, verified, interests, sensory_preferences, family_values, communication_style, match_score, blocked } = family;
  return { id, parent_name, avatar_url, location, bio, verified, interests, sensory_preferences, family_values, communication_style, match_score, blocked, children: (family.children || []).map((child: any) => ({ name: child.name, age: child.age, interests: child.interests })) };
}
export function threadParticipant(thread: Record<string, any>, userId: string) {
  return !!thread.initiator_id && (thread.initiator_id === userId || thread.family_id === userId);
}

export async function rateLimit(db: D1Database, userId: string, action: string, maximum: number, seconds = 3600) {
  const now = Math.floor(Date.now() / 1000);
  const key = `${action}:${userId}:${Math.floor(now / seconds)}`;
  const row = await db.prepare("INSERT INTO feature_rate_limits(key,count,expires_at) VALUES (?1,1,?2) ON CONFLICT(key) DO UPDATE SET count=count+1 RETURNING count").bind(key, now + seconds).first<{ count: number }>();
  return !!row && row.count <= maximum;
}
export async function preferences(db: D1Database, userId: string) {
  const row = await db.prepare("SELECT messages,playdates,community FROM notification_preferences WHERE user_id=?1").bind(userId).first<Record<string, number>>();
  return row ? { messages: !!row.messages, playdates: !!row.playdates, community: !!row.community } : DEFAULT_PREFERENCES;
}

export async function notify(env: Env, userId: string, kind: PreferenceKind, title: string, body: string, route: string) {
  // Sanity can contain demo families without a corresponding auth account.
  if (!await env.DB.prepare("SELECT id FROM users WHERE id=?1").bind(userId).first()) return;
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await env.DB.prepare("INSERT INTO user_notifications(id,user_id,kind,title,body,route,created_at) VALUES (?1,?2,?3,?4,?5,?6,?7)").bind(id, userId, kind, title, body, route, now).run();
  const prefs = await preferences(env.DB, userId);
  if (!prefs[kind]) return;
  const devices = await env.DB.prepare("SELECT token FROM push_devices WHERE user_id=?1 LIMIT 10").bind(userId).all<{ token: string }>();
  for (const device of devices.results) await env.DB.prepare("INSERT OR IGNORE INTO push_jobs(id,notification_id,token,next_attempt_at,updated_at) VALUES (?1,?2,?3,?4,?4)").bind(crypto.randomUUID(), id, device.token, now).run();
}

type Job = { id: string; token: string; user_id: string; kind: PreferenceKind; title: string; body: string; route: string; attempts: number; ticket_id: string | null };
export async function deliverPush(env: Env) {
  const now = new Date().toISOString();
  const auth: Record<string, string> = env.EXPO_ACCESS_TOKEN ? { Authorization: `Bearer ${env.EXPO_ACCESS_TOKEN}` } : {};
  const jobs = await env.DB.prepare("SELECT j.*,n.user_id,n.kind,n.title,n.body,n.route FROM push_jobs j JOIN user_notifications n ON n.id=j.notification_id WHERE j.status='pending' AND j.next_attempt_at<=?1 ORDER BY j.next_attempt_at LIMIT 4").bind(now).all<Job>();
  for (const job of jobs.results) {
    const claimed = await env.DB.prepare("UPDATE push_jobs SET status='sending',updated_at=?2 WHERE id=?1 AND status='pending'").bind(job.id, now).run();
    if (!claimed.meta.changes) continue;
    const registered = await env.DB.prepare("SELECT token FROM push_devices WHERE token=?1 AND user_id=?2").bind(job.token, job.user_id).first();
    if (!registered || !(await preferences(env.DB, job.user_id))[job.kind]) { await env.DB.prepare("UPDATE push_jobs SET status='cancelled',updated_at=?2 WHERE id=?1").bind(job.id, now).run(); continue; }
    try {
      // Lock-screen alerts intentionally contain no private message text or child names.
      const res = await fetch("https://exp.host/--/api/v2/push/send", { method: "POST", headers: { "Content-Type": "application/json", ...auth }, body: JSON.stringify({ to: job.token, title: "WaddlePlay", body: "You have a new update. Open WaddlePlay to view it.", sound: "default", channelId: "default", data: { route: job.route } }), signal: AbortSignal.timeout(10000) });
      const payload = await res.json() as any;
      const ticket = Array.isArray(payload.data) ? payload.data[0] : payload.data;
      if (!res.ok || ticket?.status !== "ok" || !ticket?.id) {
        if (ticket?.details?.error === "DeviceNotRegistered") { await env.DB.prepare("DELETE FROM push_devices WHERE token=?1").bind(job.token).run(); await env.DB.prepare("UPDATE push_jobs SET status='failed',error='DeviceNotRegistered',updated_at=?2 WHERE id=?1").bind(job.id, now).run(); continue; }
        throw new Error("Expo rejected delivery");
      }
      await env.DB.prepare("UPDATE push_jobs SET status='ticketed',ticket_id=?2,attempts=attempts+1,next_attempt_at=?3,updated_at=?4 WHERE id=?1").bind(job.id, ticket.id, new Date(Date.now() + 15 * 60000).toISOString(), now).run();
    } catch {
      const attempts = job.attempts + 1;
      await env.DB.prepare("UPDATE push_jobs SET status=?2,attempts=?3,error='Push service unavailable',next_attempt_at=?4,updated_at=?5 WHERE id=?1").bind(job.id, attempts >= 5 ? "failed" : "pending", attempts, new Date(Date.now() + Math.min(3600, 60 * 2 ** attempts) * 1000).toISOString(), now).run();
    }
  }
  // Recover work interrupted by a Worker restart. Push is at-least-once delivery.
  await env.DB.prepare("UPDATE push_jobs SET status='pending' WHERE status='sending' AND updated_at<?1").bind(new Date(Date.now() - 10 * 60000).toISOString()).run();
  const receipts = await env.DB.prepare("SELECT id,token,ticket_id,attempts FROM push_jobs WHERE status='ticketed' AND next_attempt_at<=?1 LIMIT 8").bind(now).all<Job>();
  if (receipts.results.length) {
    try {
      const res = await fetch("https://exp.host/--/api/v2/push/getReceipts", { method: "POST", headers: { "Content-Type": "application/json", ...auth }, body: JSON.stringify({ ids: receipts.results.map(j => j.ticket_id) }), signal: AbortSignal.timeout(10000) });
      if (!res.ok) throw new Error("Receipt service unavailable");
      const payload = await res.json() as any;
      for (const job of receipts.results) {
        const receipt = payload.data?.[job.ticket_id!];
        if (receipt?.details?.error === "DeviceNotRegistered") await env.DB.prepare("DELETE FROM push_devices WHERE token=?1").bind(job.token).run();
        const status = receipt?.status === "ok" ? "delivered" : receipt ? "failed" : job.attempts >= 10 ? "failed" : "ticketed";
        await env.DB.prepare("UPDATE push_jobs SET status=?2,attempts=attempts+1,error=?3,next_attempt_at=?4,updated_at=?5 WHERE id=?1").bind(job.id, status, receipt?.details?.error || (status === "failed" ? "Receipt unavailable" : null), new Date(Date.now() + 15 * 60000).toISOString(), now).run();
      }
    } catch { /* Keep tickets for the next scheduled receipt check. */ }
  }
  await env.DB.batch([
    env.DB.prepare("DELETE FROM feature_rate_limits WHERE expires_at<?1").bind(Math.floor(Date.now() / 1000)),
    env.DB.prepare("DELETE FROM user_notifications WHERE created_at<?1").bind(new Date(Date.now() - 90 * 86400000).toISOString()),
  ]);
}

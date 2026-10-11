import type { Hono } from "hono";
import type { Env, User } from "./env";
import { repo } from "./sanity";
import { findUserByEmail } from "./db";
import { signToken, verifyPassword } from "./crypto";
import { coarseLocation, DEFAULT_PREFERENCES, distanceKm, EMAIL_RE, notify, preferences, publicFamily, rateLimit, TOPICS } from "./mobile-services";

type App = Hono<{ Bindings: Env; Variables: { user: User } }>;
export function registerMobileRoutes(app: App) {
  app.post("/api/auth/email", async c => {
    const user = c.get("user");
    if (!await rateLimit(c.env.DB, user.id, "email", 5)) return c.json({ detail: "Too many attempts. Try again later." }, 429);
    const body = await c.req.json().catch(() => ({}));
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!EMAIL_RE.test(email) || email.length > 254) return c.json({ detail: "Enter a valid email address." }, 422);
    if (typeof body.password !== "string" || !await verifyPassword(body.password, user.password_hash)) return c.json({ detail: "Current password is incorrect." }, 403);
    const existing = await findUserByEmail(c.env.DB, email);
    if (existing && existing.id !== user.id) return c.json({ detail: "Email already registered." }, 409);
    try { await c.env.DB.prepare("UPDATE users SET email=?1 WHERE id=?2").bind(email, user.id).run(); }
    catch (error) { if (String(error).includes("UNIQUE")) return c.json({ detail: "Email already registered." }, 409); throw error; }
    // Auth middleware compares the token email to D1, revoking old sessions immediately.
    return c.json({ access_token: await signToken(c.env.JWT_SECRET, user.id, email, Number(c.env.JWT_EXP_MINUTES || 10080)), user: { id: user.id, email, name: user.name } });
  });

  app.post("/api/forum", async c => {
    const user = c.get("user");
    if (!await rateLimit(c.env.DB, user.id, "forum", 10)) return c.json({ detail: "Discussion limit reached. Try again later." }, 429);
    const body = await c.req.json().catch(() => ({}));
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const text = typeof body.body === "string" ? body.body.trim() : "";
    if (title.length < 3 || title.length > 140 || text.length < 10 || text.length > 5000 || !TOPICS.includes(body.topic)) return c.json({ detail: "Add a title (3–140 characters), a discussion (10–5000 characters), and a valid topic." }, 422);
    const family = await repo.familyByUserId(c.env, user.id);
    const post = { id: crypto.randomUUID(), title, body: text, topic: body.topic, author_id: user.id, author_name: family?.parent_name || user.name, avatar_url: family?.avatar_url || null, replies: 0, hours_ago: 0, created_at: new Date().toISOString() };
    await repo.createForumPost(c.env, post);
    return c.json(post, 201);
  });

  app.get("/api/profile/location", async c => c.json(await c.env.DB.prepare("SELECT latitude,longitude,updated_at FROM user_locations WHERE user_id=?1").bind(c.get("user").id).first()));
  app.put("/api/profile/location", async c => {
    const body = await c.req.json().catch(() => ({}));
    let point;
    try { point = coarseLocation(body.latitude, body.longitude); } catch { return c.json({ detail: "Invalid location." }, 422); }
    await c.env.DB.prepare("INSERT INTO user_locations(user_id,latitude,longitude,updated_at) VALUES (?1,?2,?3,?4) ON CONFLICT(user_id) DO UPDATE SET latitude=excluded.latitude,longitude=excluded.longitude,updated_at=excluded.updated_at").bind(c.get("user").id, point.latitude, point.longitude, new Date().toISOString()).run();
    return c.json(point);
  });
  app.delete("/api/profile/location", async c => { await c.env.DB.prepare("DELETE FROM user_locations WHERE user_id=?1").bind(c.get("user").id).run(); return c.json({ status: "removed" }); });
  app.get("/api/families", async c => {
    const user = c.get("user");
    let point: { latitude: number; longitude: number } | null = null;
    if (c.req.query("latitude") !== undefined || c.req.query("longitude") !== undefined) {
      try { point = coarseLocation(Number(c.req.query("latitude")), Number(c.req.query("longitude"))); } catch { return c.json({ detail: "Invalid location." }, 422); }
    }
    const radius = Number(c.req.query("radius") || 10);
    const ageMin = c.req.query("age_min") === undefined ? null : Number(c.req.query("age_min"));
    const ageMax = c.req.query("age_max") === undefined ? null : Number(c.req.query("age_max"));
    if (!Number.isFinite(radius) || radius < 1 || radius > 100 || (ageMin !== null && (!Number.isInteger(ageMin) || ageMin < 0)) || (ageMax !== null && (!Number.isInteger(ageMax) || ageMax > 18))) return c.json({ detail: "Invalid filters." }, 422);
    const blocks = await repo.blocksInvolving(c.env, user.id);
    const blocked = new Set(blocks.map(b => b.user_id === user.id ? b.target_family_id : b.user_id));
    const families = await repo.listVerifiedFamilies(c.env);
    const locations = (await c.env.DB.prepare("SELECT user_id,latitude,longitude FROM user_locations").all<{ user_id: string; latitude: number; longitude: number }>()).results;
    const lookup = new Map(locations.map(p => [p.user_id, p]));
    const interest = (c.req.query("interest") || "").toLowerCase();
    const q = (c.req.query("q") || "").toLowerCase();
    const items = families.filter(f => f.id !== user.id && !blocked.has(f.id) && (!interest || (f.interests as string[] || []).some(i => i.toLowerCase().includes(interest))) && (!q || `${f.parent_name} ${f.location} ${(f.interests as string[] || []).join(" ")}`.toLowerCase().includes(q)) && (ageMin === null && ageMax === null || (f.children as any[] || []).some(child => child.age >= (ageMin ?? 0) && child.age <= (ageMax ?? 18)))).flatMap(f => {
      const location = lookup.get(String(f.user_id || f.id));
      const distance = point && location ? distanceKm(point, location) : null;
      if (point && (distance === null || distance > radius)) return [];
      return [{ ...publicFamily(f), approximate_location: location ? { latitude: location.latitude, longitude: location.longitude } : null, distance_km: distance === null ? null : Math.round(distance * 10) / 10 }];
    });
    items.sort((a, b) => (a.distance_km ?? Infinity) - (b.distance_km ?? Infinity));
    return c.json(items);
  });

  app.get("/api/profile/verification", async c => {
    const request = await c.env.DB.prepare("SELECT status,submitted_at,reviewed_at,reason FROM verification_requests WHERE user_id=?1").bind(c.get("user").id).first();
    const family = await repo.familyByUserId(c.env, c.get("user").id);
    return c.json(request || { status: family?.verified ? "approved" : "not_started" });
  });
  app.post("/api/profile/verification", async c => {
    const user = c.get("user");
    if (!await rateLimit(c.env.DB, user.id, "verification", 3, 86400)) return c.json({ detail: "Please wait before submitting again." }, 429);
    const body = await c.req.json().catch(() => ({}));
    const statement = typeof body.statement === "string" ? body.statement.trim() : "";
    if (body.consent !== true || statement.length < 20 || statement.length > 1000) return c.json({ detail: "Add a short introduction (20–1000 characters) and agree to community review." }, 422);
    const family = await repo.familyByUserId(c.env, user.id);
    if (family?.verified) return c.json({ status: "approved" });
    const existing = await c.env.DB.prepare("SELECT status FROM verification_requests WHERE user_id=?1").bind(user.id).first<{ status: string }>();
    if (existing?.status === "pending") return c.json({ status: "pending" });
    await c.env.DB.prepare("INSERT INTO verification_requests(user_id,status,statement,submitted_at) VALUES (?1,'pending',?2,?3) ON CONFLICT(user_id) DO UPDATE SET status='pending',statement=excluded.statement,submitted_at=excluded.submitted_at,reviewed_at=NULL,reviewer_id=NULL,reason=NULL,review_locked=0").bind(user.id, statement, new Date().toISOString()).run();
    return c.json({ status: "pending" }, 201);
  });
  app.get("/api/admin/verification", async c => {
    if (!(c.env.ADMIN_USER_IDS || "").split(",").map(s => s.trim()).includes(c.get("user").id)) return c.json({ detail: "Administrator access required." }, 403);
    return c.json((await c.env.DB.prepare("SELECT r.user_id,r.status,r.statement,r.submitted_at,u.name FROM verification_requests r JOIN users u ON u.id=r.user_id WHERE r.status='pending' ORDER BY r.submitted_at LIMIT 100").all()).results);
  });
  app.post("/api/admin/verification/:id", async c => {
    const admin = c.get("user");
    if (!(c.env.ADMIN_USER_IDS || "").split(",").map(s => s.trim()).includes(admin.id)) return c.json({ detail: "Administrator access required." }, 403);
    const body = await c.req.json().catch(() => ({}));
    if (!["approved", "rejected"].includes(body.status)) return c.json({ detail: "Choose approved or rejected." }, 422);
    const reason = typeof body.reason === "string" ? body.reason.trim().slice(0, 500) : "";
    if (body.status === "rejected" && !reason) return c.json({ detail: "Explain why the request was rejected." }, 422);
    const id = c.req.param("id");
    const claim = await c.env.DB.prepare("UPDATE verification_requests SET review_locked=1 WHERE user_id=?1 AND status='pending' AND review_locked=0").bind(id).run();
    if (!claim.meta.changes) return c.json({ detail: "Request is no longer awaiting review." }, 409);
    try {
      await repo.patchFamilyByUserId(c.env, id, { verified: body.status === "approved" });
      await c.env.DB.prepare("UPDATE verification_requests SET status=?2,reason=?3,reviewer_id=?4,reviewed_at=?5,review_locked=0 WHERE user_id=?1").bind(id, body.status, reason || null, admin.id, new Date().toISOString()).run();
    } catch (error) { await c.env.DB.prepare("UPDATE verification_requests SET review_locked=0 WHERE user_id=?1").bind(id).run(); throw error; }
    c.executionCtx.waitUntil(notify(c.env, id, "community", "Community review updated", "Your verification request has been reviewed.", "/verification"));
    return c.json({ status: body.status });
  });

  app.get("/api/notifications/preferences", async c => c.json(await preferences(c.env.DB, c.get("user").id)));
  app.put("/api/notifications/preferences", async c => {
    const body = await c.req.json().catch(() => ({}));
    if (Object.keys(DEFAULT_PREFERENCES).some(key => typeof body[key] !== "boolean")) return c.json({ detail: "Invalid notification preferences." }, 422);
    await c.env.DB.prepare("INSERT INTO notification_preferences(user_id,messages,playdates,community) VALUES (?1,?2,?3,?4) ON CONFLICT(user_id) DO UPDATE SET messages=excluded.messages,playdates=excluded.playdates,community=excluded.community").bind(c.get("user").id, Number(body.messages), Number(body.playdates), Number(body.community)).run();
    return c.json(body);
  });
  app.post("/api/notifications/devices", async c => {
    const body = await c.req.json().catch(() => ({}));
    if (typeof body.token !== "string" || !/^(ExponentPushToken|ExpoPushToken)\[[A-Za-z0-9_-]{10,200}\]$/.test(body.token) || !["ios", "android"].includes(body.platform)) return c.json({ detail: "Invalid push device." }, 422);
    const user = c.get("user");
    if (!await rateLimit(c.env.DB, user.id, "push-register", 30)) return c.json({ detail: "Please try again later." }, 429);
    await c.env.DB.prepare("INSERT INTO push_devices(token,user_id,platform,updated_at) VALUES (?1,?2,?3,?4) ON CONFLICT(token) DO UPDATE SET user_id=excluded.user_id,platform=excluded.platform,updated_at=excluded.updated_at").bind(body.token, user.id, body.platform, new Date().toISOString()).run();
    return c.json({ status: "registered" });
  });
  app.delete("/api/notifications/devices", async c => {
    const body = await c.req.json().catch(() => ({}));
    if (typeof body.token !== "string") return c.json({ detail: "Token required." }, 422);
    await c.env.DB.prepare("DELETE FROM push_devices WHERE token=?1 AND user_id=?2").bind(body.token, c.get("user").id).run();
    return c.json({ status: "removed" });
  });
}

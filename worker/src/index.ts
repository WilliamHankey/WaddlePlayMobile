import { Hono } from "hono";
import { cors } from "hono/cors";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import type { Env, User } from "./env";
import { hashPassword, signToken, verifyPassword, verifyToken } from "./crypto";
import { createUser, findUserByEmail, findUserById } from "./db";
import { matchDetails } from "./matching";
import { repo } from "./sanity";
import { bodyLimit } from "hono/body-limit";
import { registerMobileRoutes } from "./mobile-routes";
import { deliverPush, notify, publicFamily, rateLimit, threadParticipant } from "./mobile-services";

type A = any;

const app = new Hono<{ Bindings: Env; Variables: { user: User } }>();

/** Mirrors FastAPI's HTTPException so clients keep the same error contract. */
class ApiError extends Error {
  status: number;
  detail: unknown;
  constructor(status: number, detail: unknown) {
    super(typeof detail === "string" ? detail : "validation error");
    this.status = status;
    this.detail = detail;
  }
}

/** Function declaration (not a const arrow) so TS narrows after each call. */
function fail(status: number, detail: string): never {
  throw new ApiError(status, detail);
}

const validationError = (errors: { loc: (string | number)[]; msg: string; type: string }[]): never => {
  throw new ApiError(422, errors.map((e) => ({ loc: ["body", ...e.loc], msg: e.msg, type: e.type })));
};

const uuid = (): string => crypto.randomUUID();
const hex = (n: number): string => crypto.randomUUID().replace(/-/g, "").slice(0, n);
const nowIso = (): string => new Date().toISOString();
/** Matches Python's datetime.now(timezone.utc).strftime("%H:%M") (UTC). */
const hhmm = (): string => new Date().toISOString().slice(11, 16);

const CATEGORY_IMAGES: Record<string, string> = {
  soccer: "https://images.unsplash.com/photo-1529900748604-07564a03e7a6?w=800",
  art: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800",
  park: "https://images.unsplash.com/photo-1471421298428-1a04ad715e18?w=800",
  music: "https://images.unsplash.com/photo-1519692933481-e162a57d6721?w=800",
  sensory: "https://images.unsplash.com/photo-1547621869-13698ff2c2f3?w=800",
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function readCredentials(body: A): { email: string; password: string; name?: string } {
  const errors: { loc: (string | number)[]; msg: string; type: string }[] = [];
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  if (!EMAIL_RE.test(email)) {
    errors.push({ loc: ["email"], msg: "value is not a valid email address: An email address must have an @-sign.", type: "value_error" });
  }
  if (password.length < 6) {
    errors.push({ loc: ["password"], msg: "String should have at least 6 characters", type: "string_too_short" });
  } else if (password.length > 72) {
    errors.push({ loc: ["password"], msg: "String should have at most 72 characters", type: "string_too_long" });
  }
  if (errors.length > 0) validationError(errors);
  return { email, password, name: typeof body?.name === "string" ? body.name : undefined };
}

function parseIntOrNull(value: string | undefined): number | null {
  if (value === undefined || value === "") return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) {
    throw new ApiError(422, [
      { loc: ["query", "value"], msg: "Input should be a valid integer", type: "int_parsing" },
    ]);
  }
  return parsed;
}

app.use(
  "*",
  cors({
    origin: "*",
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["*"],
    credentials: false,
    maxAge: 86400,
  }),
);

app.use("/api/*", bodyLimit({ maxSize: 32768, onError: c => c.json({ detail: "Request too large" }, 413) }));

const PUBLIC_PATHS = new Set(["/api/", "/api/auth/login", "/api/auth/signup"]);

app.use("/api/*", async (c, next) => {
  const path = new URL(c.req.url).pathname;
  if (PUBLIC_PATHS.has(path)) return next();

  const header = c.req.header("Authorization") ?? "";
  if (!header.toLowerCase().startsWith("bearer ")) {
    return c.json({ detail: "Invalid or expired token" }, 401);
  }
  const payload = await verifyToken(c.env.JWT_SECRET, header.slice(7).trim());
  if (!payload) return c.json({ detail: "Invalid or expired token" }, 401);
  const user = await findUserById(c.env.DB, payload.sub);
  if (!user || payload.email !== user.email) return c.json({ detail: "Invalid or expired token" }, 401);
  c.set("user", user);
  await next();
});

const auth = (c: A): User => c.get("user") as User;
const expMinutes = (env: Env): number => Number(env.JWT_EXP_MINUTES || 10080);

registerMobileRoutes(app);

async function requireVerified(env: Env, userId: string) {
  const family = await repo.familyByUserId(env, userId);
  if (!family?.verified) fail(403, "Complete community verification before joining or hosting playdates.");
}
async function threadForUser(env: Env, id: string, userId: string): Promise<A> {
  const thread = await repo.threadById(env, id);
  if (!thread || !threadParticipant(thread, userId)) fail(404, "Thread not found");
  return thread;
}
async function threadView(env: Env, thread: A, userId: string) {
  const initiator = thread.initiator_id === userId;
  const other = await repo.familyById(env, initiator ? thread.family_id : thread.initiator_id);
  return { ...thread, name: other?.parent_name || "Family", avatar_url: other?.avatar_url || null, family_id: other?.id || (initiator ? thread.family_id : thread.initiator_id), is_initiator: initiator, unread: thread[initiator ? "unread_for_initiator" : "unread_for_recipient"] || 0, messages: (thread.messages || []).map((message: A) => ({ ...message, from: (message.sender_id || (message.from === "me" ? thread.initiator_id : thread.family_id)) === userId ? "me" : "them" })) };
}

// ----------------------------- health -----------------------------
app.get("/api/", (c) => c.json({ app: "Waddle Play", status: "ok" }));

// ----------------------------- auth -----------------------------
app.post("/api/auth/signup", async (c) => {
  const { email, password, name } = readCredentials(await c.req.json().catch(() => ({})));
  if (await findUserByEmail(c.env.DB, email)) fail(409, "Email already registered");

  const userId = uuid();
  const displayName = (name || email.split("@")[0]).trim() || "Parent";
  await createUser(c.env.DB, {
    id: userId,
    email,
    name: displayName,
    password_hash: await hashPassword(password),
    created_at: nowIso(),
  });
  await repo.createFamily(c.env, {
    id: userId,
    user_id: userId,
    parent_name: displayName,
    location: "",
    bio: "",
    avatar_url: null,
    family_values: [],
    sensory_preferences: [],
    interests: [],
    communication_style: null,
    verified: false,
    children: [],
  });
  return c.json({
    access_token: await signToken(c.env.JWT_SECRET, userId, email, expMinutes(c.env)),
    user_id: userId,
    email,
    name: displayName,
  });
});

app.post("/api/auth/login", async (c) => {
  const { email, password } = readCredentials(await c.req.json().catch(() => ({})));
  const user = await findUserByEmail(c.env.DB, email);
  if (!user) return fail(401, "Incorrect email or password");
  if (!(await verifyPassword(password, user.password_hash))) {
    return fail(401, "Incorrect email or password");
  }
  return c.json({
    access_token: await signToken(c.env.JWT_SECRET, user.id, email, expMinutes(c.env)),
    user_id: user.id,
    email,
    name: user.name ?? "",
  });
});

app.get("/api/auth/me", (c) => {
  const user = auth(c);
  return c.json({ id: user.id, email: user.email, name: user.name ?? "" });
});

// ----------------------------- profile -----------------------------
app.get("/api/profile/me", async (c) => {
  const fam = await repo.familyByUserId(c.env, auth(c).id);
  if (!fam) fail(404, "Profile not found");
  return c.json(fam);
});

app.put("/api/profile/me", async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as A;
  const user = auth(c);
  const patch: A = {};
  const allowed = new Set(["parent_name", "location", "bio", "avatar_url", "family_values", "sensory_preferences", "interests", "communication_style", "children"]);
  for (const [key, value] of Object.entries(body ?? {})) {
    if (!allowed.has(key)) fail(422, `Cannot edit ${key} through the profile endpoint`);
    if (["family_values", "sensory_preferences", "interests"].includes(key) && (!Array.isArray(value) || value.length > 30 || value.some(v => typeof v !== "string" || v.length > 80))) fail(422, "Invalid profile tags");
    if (["parent_name", "location", "bio", "communication_style"].includes(key) && (typeof value !== "string" || value.length > (key === "bio" ? 2000 : 200))) fail(422, "Invalid profile field");
    if (key === "parent_name" && !String(value).trim()) fail(422, "Enter your full name");
    if (key === "avatar_url" && value !== null && (typeof value !== "string" || !/^https:\/\//.test(value) || value.length > 2048)) fail(422, "Invalid photo URL");
    if (key === "children") {
      if (!Array.isArray(value) || value.length > 12 || value.some(child => !child || typeof child.name !== "string" || !child.name.trim() || child.name.length > 100 || !Number.isInteger(child.age) || child.age < 0 || child.age > 18)) fail(422, "Invalid child profile");
      patch.children = value.map(child => ({ _key: typeof child._key === "string" ? child._key : uuid(), name: child.name.trim(), age: child.age, interests: Array.isArray(child.interests) ? child.interests.filter((i: A) => typeof i === "string").slice(0, 30) : [] }));
    } else patch[key] = value;
  }
  if (Object.keys(patch).length > 0) {
    await repo.patchFamilyByUserId(c.env, user.id, patch);
  }
  const fam = await repo.familyByUserId(c.env, user.id);
  if (!fam) fail(404, "Profile not found");
  return c.json(fam);
});

// ----------------------------- playdates -----------------------------
app.get("/api/playdates", async (c) => {
  const user = auth(c);
  const category = c.req.query("category") ?? undefined;
  const ageMin = parseIntOrNull(c.req.query("age_min"));
  const ageMax = parseIntOrNull(c.req.query("age_max"));

  const myFam = (await repo.familyByUserId(c.env, user.id)) ?? {};
  const blocks = await repo.listBlocks(c.env, user.id);
  const blockedIds = new Set(blocks.map((b: A) => b.target_family_id));

  const out: A[] = [];
  for (const raw of await repo.listPlaydates(c.env, category)) {
    const p = raw as A;
    if (blockedIds.has(p.host_family_id)) continue;
    if (ageMin !== null && p.age_max < ageMin) continue;
    if (ageMax !== null && p.age_min > ageMax) continue;
    const host = await repo.familyById(c.env, p.host_family_id);
    const { score, reasons } = matchDetails(myFam, p, host);
    p.match_score = score;
    p.match_reasons = reasons;
    p.host_verified = Boolean(host && host.verified);
    if (user.id !== p.host_family_id && !(p.attendee_family_ids ?? []).includes(user.id)) delete p.private_note;
    out.push(p);
  }
  out.sort((a, b) => b.match_score - a.match_score);
  return c.json(out);
});

app.get("/api/playdates/:playdate_id", async (c) => {
  const user = auth(c);
  const p = (await repo.playdateById(c.env, c.req.param("playdate_id"))) as A;
  if (!p) fail(404, "Playdate not found");

  const myFam = (await repo.familyByUserId(c.env, user.id)) ?? {};
  const host = await repo.familyById(c.env, p.host_family_id);
  const { score, reasons } = matchDetails(myFam, p, host);
  p.match_score = score;
  p.match_reasons = reasons;
  p.host_verified = Boolean(host && host.verified);
  p.host = host ? publicFamily(host) : null;
  p.joined = (p.attendee_family_ids ?? []).includes(user.id);
  p.is_host = user.id === p.host_family_id;

  if (p.is_host) {
    p.request_status = "host";
    p.pending_requests_count = await repo.countPendingJoinRequests(
      c.env,
      p.id as string,
    );
  } else if (p.joined) {
    p.request_status = "approved";
  } else {
    const existing = await repo.latestJoinRequest(c.env, p.id as string, user.id);
    p.request_status = existing ? existing.status : "none";
  }

  if (user.id !== p.host_family_id && !(p.attendee_family_ids ?? []).includes(user.id)) {
    delete p.private_note;
  }
  return c.json(p);
});

app.post("/api/playdates/:playdate_id/join", async (c) => {
  const user = auth(c);
  await requireVerified(c.env, user.id);
  const p = (await repo.playdateById(c.env, c.req.param("playdate_id"))) as A;
  if (!p) fail(404, "Playdate not found");
  if (user.id === p.host_family_id) fail(400, "You are the host of this playdate");
  const blocks = await repo.blocksInvolving(c.env, user.id);
  if (blocks.some(b => b.user_id === p.host_family_id || b.target_family_id === p.host_family_id)) fail(403, "This playdate is unavailable.");
  if ((p.attendee_family_ids ?? []).includes(user.id)) {
    return c.json({ status: "already_joined" });
  }
  if ((p.attendee_family_ids ?? []).length >= (p.max_children ?? 8)) {
    fail(400, "Playdate is full");
  }
  if (await repo.pendingJoinRequest(c.env, p.id as string, user.id)) {
    return c.json({ status: "already_pending" });
  }
  await repo.createJoinRequest(c.env, {
    id: uuid(),
    playdate_id: p.id,
    user_id: user.id,
    status: "pending",
    created_at: nowIso(),
  });
  c.executionCtx.waitUntil(notify(c.env, p.host_family_id, "playdates", "New playdate request", "A family requested to join your playdate.", `/playdate/${p.id}`));
  return c.json({ status: "requested" });
});

app.get("/api/playdates/:playdate_id/requests", async (c) => {
  const user = auth(c);
  const p = (await repo.playdateById(c.env, c.req.param("playdate_id"))) as A;
  if (!p) fail(404, "Playdate not found");
  if (user.id !== p.host_family_id) fail(403, "Only the host can view join requests");

  const host = await repo.familyById(c.env, p.host_family_id);
  const out: A[] = [];
  for (const r of (await repo.listPendingJoinRequests(c.env, p.id as string)) as A[]) {
    const fam = await repo.familyById(c.env, r.user_id);
    if (!fam) continue;
    const { score, reasons } = matchDetails(fam, p, host);
    out.push({ ...r, family: publicFamily(fam), match_score: score, match_reasons: reasons });
  }
  return c.json(out);
});

app.post("/api/playdates/:playdate_id/requests/:request_id/approve", async (c) => {
  const user = auth(c);
  const p = (await repo.playdateById(c.env, c.req.param("playdate_id"))) as A;
  if (!p) fail(404, "Playdate not found");
  if (user.id !== p.host_family_id) fail(403, "Only the host can approve");

  const requestId = c.req.param("request_id");
  // Fetch the specific request regardless of status.
  const req = (await repo.joinRequestById(c.env, requestId, p.id as string)) as A;
  if (!req) fail(404, "Request not found");
  if (req.status !== "pending") return c.json({ status: req.status });

  const attendees: string[] = p.attendee_family_ids ?? [];
  if (attendees.length >= (p.max_children ?? 8)) fail(400, "Playdate is full");
  if (!attendees.includes(req.user_id)) {
    await repo.patchPlaydate(c.env, p.id as string, {
      attendee_family_ids: [...attendees, req.user_id],
    });
  }
  await repo.patchJoinRequest(c.env, requestId, {
    status: "approved",
    decided_at: nowIso(),
  });
  c.executionCtx.waitUntil(notify(c.env, req.user_id, "playdates", "Playdate request approved", "Your family is invited to the playdate.", `/playdate/${p.id}`));
  return c.json({ status: "approved" });
});

app.post("/api/playdates/:playdate_id/requests/:request_id/decline", async (c) => {
  const user = auth(c);
  const p = (await repo.playdateById(c.env, c.req.param("playdate_id"))) as A;
  if (!p) fail(404, "Playdate not found");
  if (user.id !== p.host_family_id) fail(403, "Only the host can decline");

  const requestId = c.req.param("request_id");
  const req = (await repo.joinRequestById(c.env, requestId, p.id as string)) as A;
  if (!req) fail(404, "Request not found");
  if (req.status !== "pending") return c.json({ status: req.status });
  await repo.patchJoinRequest(c.env, requestId, {
    status: "declined",
    decided_at: nowIso(),
  });
  c.executionCtx.waitUntil(notify(c.env, req.user_id, "playdates", "Playdate request updated", "The host could not accept your request this time.", `/playdate/${p.id}`));
  return c.json({ status: "declined" });
});

app.post("/api/playdates", async (c) => {
  const user = auth(c);
  const body = (await c.req.json().catch(() => ({}))) as A;
  const fam = await repo.familyByUserId(c.env, user.id);
  if (!fam) fail(400, "Complete your profile first");
  await requireVerified(c.env, user.id);
  if (typeof body.title !== "string" || !body.title.trim() || body.title.length > 140 || typeof body.location !== "string" || !body.location.trim() || body.location.length > 200 || !Number.isInteger(body.age_min) || !Number.isInteger(body.age_max) || body.age_min < 0 || body.age_max > 18 || body.age_min > body.age_max) fail(422, "Invalid playdate details");

  const doc = {
    id: `pd-${hex(8)}`,
    host_family_id: user.id,
    host_name: (fam as A).parent_name ?? "Host",
    title: body.title,
    category: body.category,
    image_url: CATEGORY_IMAGES[body.category] ?? CATEGORY_IMAGES.park,
    location: body.location,
    date: body.date,
    start_time: body.start_time,
    end_time: body.end_time,
    age_range: `${body.age_min}-${body.age_max} years`,
    age_min: body.age_min,
    age_max: body.age_max,
    description: body.description ?? "",
    sensory_friendly_tags: body.sensory_friendly_tags ?? [],
    interests: body.interests ?? [],
    attendee_family_ids: [],
    attendees_avatars: [],
    max_children: Math.max(2, Math.min(20, body.max_children ?? 6)),
    private_note: (body.private_note || "").trim() || null,
    created_at: nowIso(),
  };
  await repo.createPlaydate(c.env, doc);
  return c.json(doc);
});

// ----------------------------- families -----------------------------
app.get("/api/families/:family_id", async (c) => {
  const user = auth(c);
  const fam = (await repo.familyById(c.env, c.req.param("family_id"))) as A;
  if (!fam) fail(404, "Family not found");

  const blocks = await repo.listBlocks(c.env, user.id);
  fam.blocked = blocks.some((b: A) => b.target_family_id === fam.id);

  const myFam = (await repo.familyByUserId(c.env, user.id)) ?? {};
  const { score } = matchDetails(
    myFam,
    {
      sensory_friendly_tags: fam.sensory_preferences ?? [],
      interests: fam.interests ?? [],
      age_min: 0,
      age_max: 99,
    },
    fam,
  );
  fam.match_score = score;
  return c.json(publicFamily(fam));
});

// ----------------------------- safety -----------------------------
app.post("/api/safety/block", async (c) => {
  const user = auth(c);
  const body = (await c.req.json().catch(() => ({}))) as A;
  await repo.upsertBlock(c.env, {
    id: repo.blockId(user.id, body.target_family_id),
    user_id: user.id,
    target_family_id: body.target_family_id,
    created_at: nowIso(),
  });
  return c.json({ status: "blocked" });
});

app.post("/api/safety/unblock", async (c) => {
  const user = auth(c);
  const body = (await c.req.json().catch(() => ({}))) as A;
  await repo.removeBlock(c.env, repo.blockId(user.id, body.target_family_id));
  return c.json({ status: "unblocked" });
});

app.post("/api/safety/report", async (c) => {
  const user = auth(c);
  const body = (await c.req.json().catch(() => ({}))) as A;
  await repo.createReport(c.env, {
    id: uuid(),
    user_id: user.id,
    target_family_id: body.target_family_id,
    reason: body.reason,
    created_at: nowIso(),
  });
  return c.json({ status: "reported" });
});

// ----------------------------- forum -----------------------------
app.get("/api/forum", async (c) => c.json((await repo.listForumPosts(c.env)).map(p => ({ ...p, hours_ago: p.created_at ? Math.max(0, Math.floor((Date.now() - new Date(String(p.created_at)).getTime()) / 3600000)) : p.hours_ago }))));

app.get("/api/forum/:post_id", async (c) => {
  const post = await repo.forumPostById(c.env, c.req.param("post_id"));
  if (!post) fail(404, "Post not found");
  return c.json(post);
});

// ----------------------------- resources -----------------------------
app.get("/api/resources", async (c) => {
  const user = auth(c);
  const items = (await repo.listResources(c.env)) as A[];
  const saved = await repo.listSavedResources(c.env, user.id);
  const savedIds = new Set(saved.map((s: A) => s.resource_id));
  for (const item of items) item.saved = savedIds.has(item.id);
  return c.json(items);
});

app.post("/api/resources/:resource_id/save", async (c) => {
  const user = auth(c);
  const resourceId = c.req.param("resource_id");
  if (!(await repo.resourceById(c.env, resourceId))) fail(404, "Resource not found");
  await repo.saveResource(c.env, user.id, resourceId, nowIso());
  return c.json({ status: "saved" });
});

app.post("/api/resources/:resource_id/unsave", async (c) => {
  const user = auth(c);
  await repo.unsaveResource(c.env, user.id, c.req.param("resource_id"));
  return c.json({ status: "unsaved" });
});

app.get("/api/profile/saved-resources", async (c) => {
  const user = auth(c);
  const saved = await repo.listSavedResources(c.env, user.id);
  const ids = (saved as A[]).map((s) => s.resource_id);
  if (ids.length === 0) return c.json([]);

  const items = (await repo.listResources(c.env)) as A[];
  const order = new Map<string, number>();
  ids.forEach((rid, idx) => order.set(rid, idx));
  const filtered = items.filter((r) => order.has(r.id as string));
  filtered.sort(
    (a, b) => (order.get(a.id as string) ?? 999) - (order.get(b.id as string) ?? 999),
  );
  for (const item of filtered) item.saved = true;
  return c.json(filtered);
});

// ----------------------------- threads -----------------------------
app.get("/api/threads", async (c) => {
  const user = auth(c);
  const items = await Promise.all((await repo.listThreads(c.env, user.id)).filter(t => threadParticipant(t, user.id)).map(t => threadView(c.env, t, user.id)));
  const rank = (t: A) =>
    t.status === "requested" ? (t.is_initiator ? 1 : 0) : 2;
  items.sort((a, b) => rank(a) - rank(b));
  return c.json(items);
});

app.get("/api/threads/:thread_id", async (c) => {
  const user = auth(c);
  const t = await threadForUser(c.env, c.req.param("thread_id"), user.id);
  await repo.patchThread(c.env, t.id, { [t.initiator_id === user.id ? "unread_for_initiator" : "unread_for_recipient"]: 0 });
  return c.json(await threadView(c.env, t, user.id));
});

app.post("/api/threads/:thread_id/messages", async (c) => {
  const user = auth(c);
  const body = (await c.req.json().catch(() => ({}))) as A;
  const t = await threadForUser(c.env, c.req.param("thread_id"), user.id);
  if (typeof body.text !== "string" || !body.text.trim() || body.text.length > 4000) fail(422, "Enter a message up to 4000 characters.");
  if (!await rateLimit(c.env.DB, user.id, "message", 60, 60)) fail(429, "Please slow down.");
  if (t.status === "requested") fail(400, "Waiting for the other family to accept your chat request");
  if (t.status === "declined") fail(400, "This chat request was declined");

  const at = hhmm();
  const messageId = typeof body.client_message_id === "string" && /^[A-Za-z0-9_-]{10,100}$/.test(body.client_message_id) ? body.client_message_id : uuid();
  const message = { _key: messageId, sender_id: user.id, text: body.text.trim(), at };
  const recipient = t.initiator_id === user.id ? t.family_id : t.initiator_id;
  const blocks = await repo.blocksInvolving(c.env, user.id);
  if (blocks.some(b => b.user_id === recipient || b.target_family_id === recipient)) fail(403, "This conversation is unavailable.");
  const inserted = await repo.appendMessage(c.env, t.id, message, recipient === t.initiator_id ? "unread_for_initiator" : "unread_for_recipient");
  if (inserted) c.executionCtx.waitUntil(notify(c.env, recipient, "messages", "New message", "A family sent you a message.", `/messages/${t.id}`));
  return c.json({ status: "sent", message });
});

app.post("/api/threads/request", async (c) => {
  const user = auth(c);
  const body = (await c.req.json().catch(() => ({}))) as A;
  const fam = (await repo.familyById(c.env, body.target_family_id)) as A;
  if (!fam) fail(404, "Family not found");
  if (body.target_family_id === user.id) fail(400, "You cannot message yourself");
  if (typeof body.opening_message !== "string" || !body.opening_message.trim() || body.opening_message.length > 4000) fail(422, "Enter a message up to 4000 characters.");
  if (!await rateLimit(c.env.DB, user.id, "chat-request", 20)) fail(429, "Please try again later.");
  const blocks = await repo.blocksInvolving(c.env, user.id);
  if (blocks.some(b => b.user_id === body.target_family_id || b.target_family_id === body.target_family_id)) fail(403, "This conversation is unavailable.");

  const existing = await repo.threadByFamilyAndInitiator(
    c.env,
    body.target_family_id,
    user.id,
  );
  if (existing) {
    return c.json({ status: "exists", thread_id: (existing as A).id });
  }

  const at = hhmm();
  const doc = {
    id: `th-${hex(10)}`,
    family_id: body.target_family_id,
    name: fam.parent_name ?? "Family",
    avatar_url: fam.avatar_url ?? null,
    last: body.opening_message,
    at,
    unread: 0,
    status: "requested",
    initiator_id: user.id,
    unread_for_initiator: 0,
    unread_for_recipient: 1,
    messages: [{ _key: uuid(), sender_id: user.id, text: body.opening_message.trim(), at }],
  };
  await repo.createThread(c.env, doc);
  c.executionCtx.waitUntil(notify(c.env, body.target_family_id, "messages", "New conversation", "A family would like to connect.", `/messages/${doc.id}`));
  return c.json({ status: "requested", thread_id: doc.id, thread: await threadView(c.env, doc, user.id) });
});

app.post("/api/threads/:thread_id/accept", async (c) => {
  const user = auth(c);
  const t = await threadForUser(c.env, c.req.param("thread_id"), user.id);
  if (t.family_id !== user.id) fail(403, "Only the recipient can accept");
  if (t.status !== "requested") return c.json({ status: t.status });
  await repo.patchThread(c.env, t.id as string, { status: "active" });
  c.executionCtx.waitUntil(notify(c.env, t.initiator_id, "messages", "Conversation accepted", "Your conversation is ready.", `/messages/${t.id}`));
  return c.json({ status: "active" });
});

app.post("/api/threads/:thread_id/decline", async (c) => {
  const user = auth(c);
  const t = await threadForUser(c.env, c.req.param("thread_id"), user.id);
  if (t.family_id !== user.id) fail(403, "Only the recipient can decline");
  if (t.status !== "requested") return c.json({ status: t.status });
  await repo.patchThread(c.env, t.id as string, { status: "declined" });
  return c.json({ status: "declined" });
});

// ----------------------------- notifications -----------------------------
app.get("/api/notifications", async (c) => c.json((await c.env.DB.prepare("SELECT id,kind,title,body,route,created_at AS at,unread FROM user_notifications WHERE user_id=?1 ORDER BY created_at DESC LIMIT 100").bind(auth(c).id).all()).results));

app.post("/api/notifications/read-all", async (c) => {
  await c.env.DB.prepare("UPDATE user_notifications SET unread=0 WHERE user_id=?1").bind(auth(c).id).run();
  return c.json({ status: "ok" });
});

// ----------------------------- errors -----------------------------
app.notFound((c) => c.json({ detail: "Not Found" }, 404));

app.onError((err, c) => {
  if (err instanceof ApiError) {
    return c.json({ detail: err.detail } as A, err.status as ContentfulStatusCode);
  }
  console.error("unhandled", err);
  return c.json({ detail: "Internal Server Error" }, 500);
});

export { app };
export default {
  fetch: app.fetch,
  scheduled: (_controller: ScheduledController, env: Env, ctx: ExecutionContext) => ctx.waitUntil(deliverPush(env)),
};

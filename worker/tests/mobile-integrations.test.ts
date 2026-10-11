import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { app } from "../src/index";
import { repo } from "../src/sanity";
import { hashPassword, signToken } from "../src/crypto";
import { coarseLocation, distanceKm, publicFamily, deliverPush, notify } from "../src/mobile-services";
import type { Env } from "../src/env";

// Real SQLite executes the production migrations; only the Sanity transport is mocked.
let sqlite: DatabaseSync;
let env: Env;
let families: Record<string, any>;
let posts: any[];
let threads: Record<string, any>;
let passwordHash: string;
const tokens: Record<string, string> = {};
class Statement {
  values: any[] = [];
  constructor(private sql: string) {}
  bind(...values: any[]) { this.values = values; return this; }
  normalized() { const values: any[] = []; const sql = this.sql.replace(/\?(\d+)/g, (_, index) => { values.push(this.values[Number(index) - 1]); return "?"; }); return { statement: sqlite.prepare(sql), values }; }
  async first(column?: string) { const { statement, values } = this.normalized(); const row: any = statement.get(...values); return column ? row?.[column] ?? null : row ?? null; }
  async all() { const { statement, values } = this.normalized(); return { results: statement.all(...values), success: true, meta: {} }; }
  async run() { const { statement, values } = this.normalized(); const result = statement.run(...values); return { success: true, results: [], meta: { changes: Number(result.changes) } }; }
}
beforeEach(async () => {
  sqlite?.close();
  sqlite = new DatabaseSync(":memory:");
  sqlite.exec("PRAGMA foreign_keys=ON");
  for (const file of ["0001_users.sql", "0003_mobile_integrations.sql"]) sqlite.exec(readFileSync(new URL(`../migrations/${file}`, import.meta.url), "utf8"));
  passwordHash ||= await hashPassword("password123");
  for (const id of ["alice", "bob", "mallory", "admin"]) {
    sqlite.prepare("INSERT INTO users(id,email,name,password_hash,created_at) VALUES (?,?,?,?,?)").run(id, `${id}@example.com`, id, passwordHash, new Date().toISOString());
    tokens[id] = await signToken("test-secret", id, `${id}@example.com`, 60);
  }
  env = { DB: { prepare: (sql: string) => new Statement(sql), batch: async (statements: Statement[]) => Promise.all(statements.map(s => s.run())) }, JWT_SECRET: "test-secret", JWT_EXP_MINUTES: "60", ADMIN_USER_IDS: "admin" } as unknown as Env;
  families = Object.fromEntries(["alice", "bob", "mallory", "admin"].map(id => [id, { id, user_id: id, parent_name: id, verified: false, email: `${id}@example.com`, interests: ["soccer"], children: [{ name: "Child", age: 5, diagnosis: "PRIVATE" }] }]));
  posts = [];
  threads = { chat: { id: "chat", family_id: "bob", initiator_id: "alice", status: "active", messages: [], unread_for_initiator: 0, unread_for_recipient: 0 } };
  Object.assign(repo, {
    familyByUserId: async (_: any, id: string) => families[id] || null,
    familyById: async (_: any, id: string) => families[id] || null,
    patchFamilyByUserId: async (_: any, id: string, patch: any) => Object.assign(families[id], patch),
    listVerifiedFamilies: async () => Object.values(families).filter(f => f.verified),
    blocksInvolving: async () => [],
    createForumPost: async (_: any, post: any) => posts.push(post),
    listForumPosts: async () => posts,
    listThreads: async (_: any, id: string) => Object.values(threads).filter(t => t.initiator_id === id || t.family_id === id),
    threadById: async (_: any, id: string) => threads[id] ? structuredClone(threads[id]) : null,
    patchThread: async (_: any, id: string, patch: any) => Object.assign(threads[id], patch),
    appendMessage: async (_: any, id: string, message: any, field: string) => { if (threads[id].messages.some((m: any) => m._key === message._key)) return false; threads[id].messages.push(message); threads[id][field] = (threads[id][field] || 0) + 1; return true; },
  });
});
async function request(path: string, user = "alice", method = "GET", body?: any, token?: string) {
  const tasks: Promise<unknown>[] = [];
  const response = await app.fetch(new Request(`https://example.test/api${path}`, { method, headers: { Authorization: `Bearer ${token || tokens[user]}`, "Content-Type": "application/json" }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) }), env, { waitUntil: (p: Promise<unknown>) => tasks.push(p) } as any);
  await Promise.all(tasks);
  return { status: response.status, body: await response.json() as any };
}

test("email changes require password, enforce uniqueness, and revoke old sessions", async () => {
  assert.equal((await request("/auth/email", "alice", "POST", { email: "new@example.com", password: "wrong" })).status, 403);
  assert.equal((await request("/auth/email", "alice", "POST", { email: "bob@example.com", password: "password123" })).status, 409);
  assert.equal((await request("/auth/email", "alice", "POST", { email: "bad@", password: "password123" })).status, 422);
  const result = await request("/auth/email", "alice", "POST", { email: "new@example.com", password: "password123" });
  assert.equal(result.status, 200);
  assert.equal((await request("/auth/me")).status, 401);
  assert.equal((await request("/auth/me", "alice", "GET", undefined, result.body.access_token)).body.email, "new@example.com");
  assert.equal(families.alice.email, "alice@example.com"); // Private auth mutation never writes an address into Sanity.
});
test("discussion posting validates content and cannot impersonate another author", async () => {
  assert.equal((await request("/forum", "alice", "POST", { title: "x", body: "short", topic: "invalid" })).status, 422);
  const result = await request("/forum", "alice", "POST", { title: "Weekend walks", body: "Which walks are best for little ones?", topic: "Local", author_id: "bob" });
  assert.equal(result.status, 201);
  assert.equal(posts[0].author_id, "alice");
  assert.equal((await request("/forum")).body.length, 1);
});
test("profile whitelist prevents self-verification and arbitrary field injection", async () => {
  assert.equal((await request("/profile/me", "alice", "PUT", { verified: true })).status, 422);
  assert.equal((await request("/profile/me", "alice", "PUT", { user_id: "bob" })).status, 422);
  assert.equal(families.alice.verified, false);
  assert.equal((await request("/playdates", "alice", "POST", { title: "Park", location: "Park", age_min: 4, age_max: 6 })).status, 403);
});
test("manual verification requires consent and an authorized administrator decision", async () => {
  assert.equal((await request("/profile/verification", "alice", "POST", { statement: "We are a family interested in playdates.", consent: false })).status, 422);
  assert.equal((await request("/profile/verification", "alice", "POST", { statement: "We are a family interested in playdates.", consent: true })).body.status, "pending");
  assert.equal((await request("/admin/verification", "bob")).status, 403);
  assert.equal((await request("/admin/verification/alice", "bob", "POST", { status: "approved" })).status, 403);
  assert.equal((await request("/admin/verification", "admin")).body.length, 1);
  assert.equal((await request("/admin/verification/alice", "admin", "POST", { status: "approved" })).status, 200);
  assert.equal(families.alice.verified, true);
  assert.equal((await request("/profile/verification")).body.status, "approved");
  assert.equal((await request("/admin/verification/alice", "admin", "POST", { status: "rejected", reason: "Wrong" })).status, 409);
});
test("locations are validated, rounded, removable, and publicly filtered by distance", async () => {
  assert.throws(() => coarseLocation(NaN, 18));
  assert.throws(() => coarseLocation(91, 18));
  const result = await request("/profile/location", "bob", "PUT", { latitude: -33.923456, longitude: 18.423456 });
  assert.deepEqual(result.body, { latitude: -33.92, longitude: 18.42 });
  families.bob.verified = true;
  const nearby = await request("/families?latitude=-33.92&longitude=18.42&radius=5");
  assert.equal(nearby.body.length, 1);
  assert.equal(nearby.body[0].email, undefined);
  assert.equal(nearby.body[0].children[0].diagnosis, undefined);
  assert.ok(distanceKm({ latitude: 0, longitude: 179.99 }, { latitude: 0, longitude: -179.99 }) < 3);
  assert.equal((await request("/families?latitude=90.1&longitude=0")).status, 422);
  assert.equal((await request("/profile/location", "bob", "DELETE")).status, 200);
  assert.equal((await request("/profile/location", "bob")).body, null);
});
test("notification preferences and devices are account-scoped", async () => {
  const token = "ExpoPushToken[abcdefghijklmno]";
  assert.equal((await request("/notifications/devices", "alice", "POST", { token, platform: "android" })).status, 200);
  await request("/notifications/devices", "bob", "DELETE", { token });
  assert.equal(sqlite.prepare("SELECT user_id FROM push_devices").get()?.user_id, "alice");
  await request("/notifications/preferences", "alice", "PUT", { messages: false, playdates: true, community: true });
  assert.equal((await request("/notifications/preferences")).body.messages, false);
  assert.equal((await request("/notifications/preferences", "bob")).body.messages, true);
  await notify(env, "alice", "messages", "Private", "Message details", "/messages/chat");
  assert.equal(sqlite.prepare("SELECT count(*) as n FROM push_jobs").get()?.n, 0);
  assert.equal((await request("/notifications", "bob")).body.length, 0);
  await request("/notifications/read-all", "bob", "POST");
  assert.equal((await request("/notifications")).body[0].unread, 1);
});
test("threads are participant-only and retries do not duplicate messages", async () => {
  assert.equal((await request("/threads/chat", "mallory")).status, 404);
  assert.equal((await request("/threads/chat/messages", "mallory", "POST", { text: "x" })).status, 404);
  const message = { text: "Hello Bob", client_message_id: "message-123456" };
  assert.equal((await request("/threads/chat/messages", "alice", "POST", message)).status, 200);
  await request("/threads/chat/messages", "alice", "POST", message);
  assert.equal(threads.chat.messages.length, 1);
  assert.equal((await request("/threads/chat", "bob")).body.messages[0].from, "them");
  assert.equal((await request("/threads", "mallory")).body.length, 0);
  assert.equal((await request("/notifications", "bob")).body.length, 1);
});
test("push outbox checks registration and records Expo receipts without leaking message content", async () => {
  await request("/notifications/devices", "bob", "POST", { token: "ExpoPushToken[abcdefghijklmno]", platform: "android" });
  await notify(env, "bob", "messages", "Private parent name", "Sensitive message", "/messages/chat");
  const original = globalThis.fetch;
  try {
    let sent: any;
    globalThis.fetch = (async (_url: any, init: any) => { sent = JSON.parse(init.body); return new Response(JSON.stringify({ data: { status: "ok", id: "ticket1" } }), { headers: { "Content-Type": "application/json" } }); }) as any;
    await deliverPush(env);
    assert.equal(sent.title, "WaddlePlay");
    assert.ok(!JSON.stringify(sent).includes("Sensitive"));
    assert.equal(sqlite.prepare("SELECT status FROM push_jobs").get()?.status, "ticketed");
    sqlite.exec("UPDATE push_jobs SET next_attempt_at='2000-01-01'");
    globalThis.fetch = (async () => new Response(JSON.stringify({ data: { ticket1: { status: "ok" } } }), { headers: { "Content-Type": "application/json" } })) as any;
    await deliverPush(env);
    assert.equal(sqlite.prepare("SELECT status FROM push_jobs").get()?.status, "delivered");
  } finally { globalThis.fetch = original; }
});
test("push jobs cancel when preferences change before delivery", async () => {
  await request("/notifications/devices", "bob", "POST", { token: "ExpoPushToken[abcdefghijklmno]", platform: "android" });
  await notify(env, "bob", "messages", "New message", "Private", "/messages/chat");
  await request("/notifications/preferences", "bob", "PUT", { messages: false, playdates: true, community: false });
  const original = globalThis.fetch;
  let calls = 0;
  try { globalThis.fetch = (async () => { calls++; throw new Error("Network must not be used"); }) as any; await deliverPush(env); }
  finally { globalThis.fetch = original; }
  assert.equal(calls, 0);
  assert.equal(sqlite.prepare("SELECT status FROM push_jobs").get()?.status, "cancelled");
});
test("invalid Expo devices are removed and transient failures are retried", async () => {
  await request("/notifications/devices", "bob", "POST", { token: "ExpoPushToken[abcdefghijklmno]", platform: "android" });
  await notify(env, "bob", "messages", "New message", "Private", "/messages/chat");
  const original = globalThis.fetch;
  try {
    globalThis.fetch = (async () => { throw new Error("Offline"); }) as any;
    await deliverPush(env);
    assert.equal(sqlite.prepare("SELECT status FROM push_jobs").get()?.status, "pending");
    assert.equal(sqlite.prepare("SELECT attempts FROM push_jobs").get()?.attempts, 1);
    sqlite.exec("UPDATE push_jobs SET next_attempt_at='2000-01-01'");
    globalThis.fetch = (async () => new Response(JSON.stringify({ data: { status: "error", details: { error: "DeviceNotRegistered" } } }), { headers: { "Content-Type": "application/json" } })) as any;
    await deliverPush(env);
    assert.equal(sqlite.prepare("SELECT status FROM push_jobs").get()?.status, "failed");
    assert.equal(sqlite.prepare("SELECT count(*) as n FROM push_devices").get()?.n, 0);
  } finally { globalThis.fetch = original; }
});
test("email reauthentication is rate limited", async () => {
  for (let i = 0; i < 5; i++) assert.equal((await request("/auth/email", "alice", "POST", { email: "new@example.com", password: "wrong" })).status, 403);
  assert.equal((await request("/auth/email", "alice", "POST", { email: "new@example.com", password: "wrong" })).status, 429);
});
test("public family projection never includes account details", () => {
  const safe: any = publicFamily({ id: "x", email: "private", statement: "private", password_hash: "private", children: [{ name: "A", age: 5, diagnosis: "private" }] });
  assert.equal(safe.email, undefined);
  assert.equal(safe.password_hash, undefined);
  assert.equal(safe.statement, undefined);
  assert.equal(safe.children[0].diagnosis, undefined);
});

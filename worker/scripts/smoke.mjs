/**
 * Contract smoke test for the WaddlePlay Worker.
 *
 *   node scripts/smoke.mjs [baseUrl]
 *
 * Defaults to the local dev server. Point it at the deployed Worker to verify
 * the same contract in production. Exits non-zero if any check fails.
 */
const BASE = (process.argv[2] ?? "http://127.0.0.1:8787").replace(/\/$/, "");
const API = `${BASE}/api`;

let passed = 0;
const failures = [];

function check(name, condition, extra = "") {
  if (condition) {
    passed += 1;
  } else {
    failures.push(`${name}${extra ? ` — ${extra}` : ""}`);
  }
}

async function call(method, path, { token, body } = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let json = null;
  try {
    json = await res.json();
  } catch {
    /* empty body */
  }
  return { status: res.status, json };
}

const DEMO = { email: "demo@waddleplay.com", password: "password123" };
// Unique per run: the account must have a matching family profile in Sanity,
// and reusing an email would collide with a family that cleanup removed.
const RUN_ID = Date.now().toString(36);
const NEWUSER = {
  email: `smoke-${RUN_ID}@waddleplay.com`,
  password: "password123",
  name: "Smoke Tester",
};

// ---- health ----
{
  const r = await call("GET", "/");
  check("GET /api/ returns 200", r.status === 200, `got ${r.status}`);
  check("GET /api/ payload", r.json?.app === "Waddle Play" && r.json?.status === "ok");
}

// ---- auth guards ----
{
  const r = await call("GET", "/playdates");
  check("unauthenticated request is 401", r.status === 401, `got ${r.status}`);
  check("401 body detail", r.json?.detail === "Invalid or expired token");
}

// ---- login ----
let token = "";
{
  const bad = await call("POST", "/auth/login", { body: { ...DEMO, password: "wrongpass" } });
  check("bad password is 401", bad.status === 401, `got ${bad.status}`);
  check("bad password detail", bad.json?.detail === "Incorrect email or password");

  const r = await call("POST", "/auth/login", { body: DEMO });
  check("demo login is 200", r.status === 200, `got ${r.status}`);
  check("login returns access_token", typeof r.json?.access_token === "string");
  check("login returns user_id", r.json?.user_id === "demo-user-1", r.json?.user_id);
  check("login returns email + name", r.json?.email === DEMO.email && r.json?.name === "Demo Parent");
  token = r.json?.access_token ?? "";
}

// ---- signup validation ----
{
  const short = await call("POST", "/auth/signup", { body: { email: "x@y.com", password: "123" } });
  check("short password is 422", short.status === 422, `got ${short.status}`);
  check("422 detail is a list", Array.isArray(short.json?.detail));

  const badEmail = await call("POST", "/auth/signup", { body: { email: "nope", password: "password123" } });
  check("invalid email is 422", badEmail.status === 422, `got ${badEmail.status}`);
}

// ---- /auth/me + profile ----
{
  const me = await call("GET", "/auth/me", { token });
  check("GET /auth/me 200", me.status === 200, `got ${me.status}`);
  check("/auth/me returns id/email/name", me.json?.id === "demo-user-1" && me.json?.email === DEMO.email);

  const prof = await call("GET", "/profile/me", { token });
  check("GET /profile/me 200", prof.status === 200, `got ${prof.status}`);
  check("profile has children", Array.isArray(prof.json?.children) && prof.json.children.length === 1);
  check("profile has verified", prof.json?.verified === true);

  const put = await call("PUT", "/profile/me", { token, body: { bio: "Smoke test bio" } });
  check("PUT /profile/me 200", put.status === 200, `got ${put.status}`);
  check("PUT /profile/me applied", put.json?.bio === "Smoke test bio", put.json?.bio);
}

// ---- playdates ----
let createdPlaydateId = "";
{
  const all = await call("GET", "/playdates", { token });
  check("GET /playdates 200", all.status === 200, `got ${all.status}`);
  check("playdates list is non-empty", Array.isArray(all.json) && all.json.length >= 5, `got ${all.json?.length}`);
  check(
    "playdates have match_score",
    all.json?.every((p) => typeof p.match_score === "number" && Array.isArray(p.match_reasons)),
  );
  const scores = (all.json ?? []).map((p) => p.match_score);
  check(
    "playdates sorted by match_score desc",
    scores.every((s, i) => i === 0 || scores[i - 1] >= s),
    scores.join(","),
  );
  check("playdates expose host_verified", all.json?.every((p) => typeof p.host_verified === "boolean"));
  check("playdates have id", all.json?.every((p) => typeof p.id === "string" && p.id.startsWith("pd-")));

  const filtered = await call("GET", "/playdates?category=park", { token });
  check("category filter works", filtered.json?.length === 1 && filtered.json[0].id === "pd-park", JSON.stringify(filtered.json?.map((p) => p.id)));

  const byAge = await call("GET", "/playdates?age_min=7", { token });
  check(
    "age_min filter excludes non-overlapping",
    (byAge.json ?? []).every((p) => p.age_max >= 7),
  );

  const one = await call("GET", "/playdates/pd-park", { token });
  check("GET /playdates/:id 200", one.status === 200, `got ${one.status}`);
  check("detail has is_host/joined", one.json?.is_host === false && typeof one.json?.joined === "boolean");
  check("detail has request_status", typeof one.json?.request_status === "string", one.json?.request_status);
  check("detail embeds host", one.json?.host?.id === "fam-sarah", one.json?.host?.id);

  const missing = await call("GET", "/playdates/pd-nope", { token });
  check("missing playdate is 404", missing.status === 404, `got ${missing.status}`);
  check("404 detail message", missing.json?.detail === "Playdate not found");

  const created = await call("POST", "/playdates", {
    token,
    body: {
      title: "Smoke Test Playdate",
      category: "art",
      location: "Somewhere",
      date: "2026-07-01",
      start_time: "10:00 AM",
      end_time: "12:00 PM",
      age_min: 4,
      age_max: 6,
      description: "temp",
      sensory_friendly_tags: ["quiet"],
      interests: ["painting"],
      max_children: 3,
      private_note: "host only note",
    },
  });
  check("POST /playdates 200", created.status === 200, `got ${created.status}`);
  check("created playdate id", typeof created.json?.id === "string" && created.json.id.startsWith("pd-"), created.json?.id);
  check("max_children clamped to 3", created.json?.max_children === 3);
  check("age_range formatted", created.json?.age_range === "4-6 years", created.json?.age_range);
  check("category image assigned", typeof created.json?.image_url === "string" && created.json.image_url.length > 0);
  createdPlaydateId = created.json?.id ?? "";
}

// ---- private_note visibility ----
if (createdPlaydateId) {
  const host = await call("GET", `/playdates/${createdPlaydateId}`, { token });
  check("host sees private_note", host.json?.private_note === "host only note");
}

// ---- join / requests / approve ----
{
  const newUser = await call("POST", "/auth/signup", { body: NEWUSER });
  check("signup returns 200", newUser.status === 200, `got ${newUser.status}`);
  let guestToken = newUser.json?.access_token ?? "";
  check("signup returns token", typeof guestToken === "string");

  const dupe = await call("POST", "/auth/signup", { body: NEWUSER });
  check("duplicate email is 409", dupe.status === 409, `got ${dupe.status}`);
  check("409 detail", dupe.json?.detail === "Email already registered");

  if (guestToken) {
    const forbidden = await call("GET", "/playdates/pd-soccer/requests", { token: guestToken });
    check("non-host cannot view requests (403)", forbidden.status === 403, `got ${forbidden.status}`);
    check("403 detail", forbidden.json?.detail === "Only the host can view join requests");

    const blockedNote = await call("GET", `/playdates/${createdPlaydateId}`, { token: guestToken });
    check("non-host cannot see private_note", blockedNote.json && blockedNote.json.private_note === undefined);

    const join = await call("POST", `/playdates/${createdPlaydateId}/join`, { token: guestToken });
    check("join returns requested", join.json?.status === "requested", JSON.stringify(join.json));
    const again = await call("POST", `/playdates/${createdPlaydateId}/join`, { token: guestToken });
    check("re-join returns already_pending", again.json?.status === "already_pending", JSON.stringify(again.json));

    if (createdPlaydateId) {
      const hostReqs = await call("GET", `/playdates/${createdPlaydateId}/requests`, { token });
      check("host sees pending request", Array.isArray(hostReqs.json) && hostReqs.json.length >= 1, JSON.stringify(hostReqs.json?.length));
      check("request carries family + match", hostReqs.json?.[0]?.family && typeof hostReqs.json?.[0]?.match_score === "number");

      const reqId = hostReqs.json?.[0]?.id;
      if (reqId) {
        const approve = await call("POST", `/playdates/${createdPlaydateId}/requests/${reqId}/approve`, { token });
        check("approve returns approved", approve.json?.status === "approved", JSON.stringify(approve.json));

        const after = await call("GET", `/playdates/${createdPlaydateId}/requests`, { token });
        check("approved request leaves pending list", (after.json?.length ?? 0) === 0);

        const guestView = await call("GET", `/playdates/${createdPlaydateId}`, { token: guestToken });
        check("approved attendee sees private_note", guestView.json?.private_note === "host only note");
        check("approved attendee request_status", guestView.json?.request_status === "approved", guestView.json?.request_status);
      }
    }

    const selfChat = await call("POST", "/threads/request", { token: guestToken, body: { target_family_id: "", opening_message: "hi" } });
    check("chat to unknown family is 404", selfChat.status === 404, `got ${selfChat.status}`);
  }
}

// ---- families ----
{
  const fam = await call("GET", "/families/fam-sarah", { token });
  check("GET /families/:id 200", fam.status === 200, `got ${fam.status}`);
  check("family blocked flag present", typeof fam.json?.blocked === "boolean");
  check("family match_score present", typeof fam.json?.match_score === "number");

  const missing = await call("GET", "/families/fam-nope", { token });
  check("missing family is 404", missing.status === 404, `got ${missing.status}`);
  check("family 404 detail", missing.json?.detail === "Family not found");
}

// ---- safety ----
{
  const block = await call("POST", "/safety/block", { token, body: { target_family_id: "fam-james" } });
  check("block returns blocked", block.json?.status === "blocked", JSON.stringify(block.json));

  const check1 = await call("GET", "/families/fam-james", { token });
  check("blocked flag true after block", check1.json?.blocked === true);

  const list = await call("GET", "/playdates", { token });
  const hidden = (list.json ?? []).some((p) => p.host_family_id === "fam-james");
  check("blocked host's playdates hidden", !hidden, "pd-soccer should be hidden");

  const unblock = await call("POST", "/safety/unblock", { token, body: { target_family_id: "fam-james" } });
  check("unblock returns unblocked", unblock.json?.status === "unblocked");

  const list2 = await call("GET", "/playdates", { token });
  check("playdates return after unblock", (list2.json ?? []).some((p) => p.host_family_id === "fam-james"));

  const report = await call("POST", "/safety/report", { token, body: { target_family_id: "fam-james", reason: "spam" } });
  check("report returns reported", report.json?.status === "reported", JSON.stringify(report.json));
}

// ---- forum ----
{
  const list = await call("GET", "/forum", { token });
  check("forum returns seeded posts", list.json?.length >= 5, `got ${list.json?.length}`);
  check("forum sorted by hours_ago", (list.json ?? []).every((p, i, a) => i === 0 || a[i - 1].hours_ago <= p.hours_ago));

  const one = await call("GET", "/forum/fp-1", { token });
  check("GET /forum/:id 200", one.status === 200 && one.json?.id === "fp-1");

  const missing = await call("GET", "/forum/fp-999", { token });
  check("missing forum post is 404", missing.status === 404, `got ${missing.status}`);
}

// ---- resources ----
{
  const list = await call("GET", "/resources", { token });
  check("GET /resources returns seeded items", list.json?.length >= 5, `got ${list.json?.length}`);
  check("resources have saved flag", list.json?.every((r) => r.saved === false || r.saved === true));

  const save = await call("POST", "/resources/rs-1/save", { token });
  check("save returns saved", save.json?.status === "saved", JSON.stringify(save.json));

  const after = await call("GET", "/resources", { token });
  check("rs-1 now saved", after.json?.find((r) => r.id === "rs-1")?.saved === true);

  const savedList = await call("GET", "/profile/saved-resources", { token });
  check("saved-resources lists rs-1", savedList.json?.some((r) => r.id === "rs-1"), JSON.stringify(savedList.json?.map((r) => r.id)));
  check("saved-resources marks saved", savedList.json?.every((r) => r.saved === true));

  const unsave = await call("POST", "/resources/rs-1/unsave", { token });
  check("unsave returns unsaved", unsave.json?.status === "unsaved");

  const savedList2 = await call("GET", "/profile/saved-resources", { token });
  check("saved-resources empty after unsave", savedList2.json?.length === 0, `got ${savedList2.json?.length}`);

  const missing = await call("POST", "/resources/rs-999/save", { token });
  check("saving unknown resource is 404", missing.status === 404, `got ${missing.status}`);
}

// ---- threads ----
{
  const list = await call("GET", "/threads", { token });
  check("GET /threads returns seeded threads", list.json?.length >= 4, `got ${list.json?.length}`);
  check("threads have is_initiator", list.json?.every((t) => typeof t.is_initiator === "boolean"));
  check("threads default status active", list.json?.every((t) => t.status === "active" || t.status === "requested"));

  const one = await call("GET", "/threads/th-sarah", { token });
  check("GET /threads/:id 200", one.status === 200 && one.json?.id === "th-sarah");
  const beforeMessages = Array.isArray(one.json?.messages) ? one.json.messages.length : 0;
  check("thread carries messages", beforeMessages >= 1, `got ${beforeMessages}`);

  const sent = await call("POST", "/threads/th-sarah/messages", { token, body: { text: "Smoke hello" } });
  check("send message returns sent", sent.json?.status === "sent", JSON.stringify(sent.json));
  check("message echo has from=me", sent.json?.message?.from === "me" && sent.json?.message?.text === "Smoke hello");

  const after = await call("GET", "/threads/th-sarah", { token });
  check("message appended", (after.json?.messages?.length ?? 0) === beforeMessages + 1, `got ${after.json?.messages?.length}`);

  const missing = await call("GET", "/threads/th-999", { token });
  check("missing thread is 404", missing.status === 404, `got ${missing.status}`);
}

// ---- chat request lifecycle ----
{
  const req = await call("POST", "/threads/request", { token, body: { target_family_id: "fam-tom", opening_message: "Hi Tom!" } });
  check("chat request created or exists", ["requested", "exists"].includes(req.json?.status), JSON.stringify(req.json?.status));
  check("chat request returns thread_id", typeof req.json?.thread_id === "string");

  const self = await call("POST", "/threads/request", { token, body: { target_family_id: "demo-user-1", opening_message: "me" } });
  check("cannot message self (400)", self.status === 400, `got ${self.status}`);
  check("self message detail", self.json?.detail === "You cannot message yourself");

  const requested = await call("POST", "/threads/request", { token, body: { target_family_id: "fam-david", opening_message: "Hi David" } });
  const requestedId = requested.json?.thread_id;
  if (requestedId) {
    const blocked = await call("POST", `/threads/${requestedId}/messages`, { token, body: { text: "too early" } });
    check("cannot message pending thread (400)", blocked.status === 400, `got ${blocked.status}`);
    check("pending thread detail", blocked.json?.detail === "Waiting for the other family to accept your chat request");

    const accept = await call("POST", `/threads/${requestedId}/accept`, { token });
    check("initiator cannot accept own request", accept.status === 400, `got ${accept.status}`);

    const acceptOther = await call("POST", `/threads/${requestedId}/decline`, { token });
    check("initiator cannot decline own request", acceptOther.status === 400, `got ${acceptOther.status}`);
  }
}

// ---- notifications ----
{
  const list = await call("GET", "/notifications", { token });
  check("GET /notifications returns 5", list.json?.length >= 5, `got ${list.json?.length}`);

  const read = await call("POST", "/notifications/read-all", { token });
  check("read-all returns ok", read.json?.status === "ok", JSON.stringify(read.json));

  const after = await call("GET", "/notifications", { token });
  check("all notifications read", after.json?.every((n) => n.unread === false));
}

// ---- unknown route ----
{
  const r = await call("GET", "/does-not-exist", { token });
  check("unknown route is 404", r.status === 404, `got ${r.status}`);
}

console.log(`\n${passed} checks passed, ${failures.length} failed.`);
if (failures.length > 0) {
  console.log("\nFailures:");
  for (const f of failures) console.log(`  x ${f}`);
  process.exit(1);
}

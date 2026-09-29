/**
 * Removes artifacts created by scripts/smoke.mjs so the demo dataset matches
 * its seeded state. Safe to re-run.
 *
 *   node scripts/cleanup-test-data.mjs
 *
 * Removes: playdates titled "Smoke Test Playdate", threads whose initiator is
 * the smoke-test account, that account's family profile, and restores
 * th-sarah's messages to the seeded four.
 */
import { readFileSync } from "node:fs";
import { createClient } from "@sanity/client";
import { SEED_THREADS } from "./seedData";

try {
  for (const line of readFileSync(new URL("../.dev.vars", import.meta.url), "utf8").split("\n")) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*"(.*)"\s*$/.exec(line);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2];
  }
} catch {
  /* ambient env */
}

const client = createClient({
  projectId: process.env.SANITY_PROJECT_ID,
  dataset: process.env.SANITY_DATASET ?? "production",
  apiVersion: "2024-10-01",
  token: process.env.SANITY_TOKEN,
  useCdn: false,
});

// Match the smoke-test email shape, e.g. smoke-mfk3xq1@waddleplay.com
const smokeUsers: string[] = await client.fetch(
  '*[_type == "family" && parent_name == "Smoke Tester" && email match "smoke-*"].user_id',
);
const smokeSet = new Set(smokeUsers ?? []);
console.log(`smoke-test accounts: ${smokeUsers.length}`);

type Doc = { _id: string; user_id?: string };

const staleThreads: Doc[] = await client.fetch(
  '*[_type == "thread" && !(_id in ["thread.th-sarah","thread.th-james","thread.th-emma","thread.th-lisa"])]',
);
const stalePlaydates: Doc[] = await client.fetch(
  '*[_type == "playdate" && title == "Smoke Test Playdate"]',
);
const smokeDocs: Doc[] = await client.fetch(
  '*[(_type == "playdate" || _type == "forumPost" || _type == "resource") && defined(user_id) && user_id in $ids]',
  { ids: [...smokeSet] },
);
const staleNotifications: Doc[] = await client.fetch(
  '*[_type == "notification" && defined(user_id) && user_id in $ids]',
  { ids: [...smokeSet] },
);
// Safety records written by the smoke test: it blocks/unblocks a family and
// files a report, and neither is removed by the test itself.
const staleSafetyRecords: Doc[] = await client.fetch(
  '*[(_type == "safetyBlock" || _type == "report") && defined(user_id) && user_id in $ids]',
  { ids: [...smokeSet] },
);

// Records whose owner is gone. Cleanup deletes the smoke family profile but
// D1-side records (join requests, reports, blocks) outlive it, and a later run
// can no longer match them by user_id because the family document is gone.
// A real user always has a family profile, so "no family" means "test data".
const orphaned: string[] = await client.fetch(
  '*[_type in ["joinRequest", "report", "safetyBlock"] && !(user_id in *[_type == "family"].user_id)]._id',
);

// A report has no delete endpoint in the API, so the smoke test files it as the
// throwaway user. Older runs used the demo user, so clear those too.
const demoReports: string[] = await client.fetch(
  '*[_type == "report" && user_id == "demo-user-1" && reason == "spam" && target_family_id == "fam-james"]._id',
);

const deletions = [
  ...staleThreads.map((d) => d._id),
  ...stalePlaydates.map((d) => d._id),
  ...smokeDocs.map((d) => d._id),
  ...staleNotifications.map((d) => d._id),
  ...staleSafetyRecords.map((d) => d._id),
  ...orphaned,
  ...demoReports,
  ...smokeUsers.map((id) => `family.${id}`),
].filter(Boolean);

if (deletions.length > 0) {
  await client.mutate(deletions.map((id) => ({ delete: { id } })));
  console.log(`deleted ${deletions.length} documents`);
} else {
  console.log("nothing to delete");
}

// Restore seeded thread messages.
for (const thread of SEED_THREADS) {
  await client.patch(`thread.${thread.id}`).set({ messages: thread.messages }).commit();
}
console.log(`restored ${SEED_THREADS.length} seeded threads`);

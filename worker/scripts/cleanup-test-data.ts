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

// Match the current smoke-test email shape, e.g. smoke-mfk3xq1@waddleplay.com
const smokeUsers = await client.fetch(
  '*[_type == "family" && parent_name == "Smoke Tester" && defined(email) && email[0] == "s"].user_id',
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

const deletions = [
  ...staleThreads.map((d) => d._id),
  ...stalePlaydates.map((d) => d._id),
  ...smokeUsers.map((id: string) => `family.${id}`),
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

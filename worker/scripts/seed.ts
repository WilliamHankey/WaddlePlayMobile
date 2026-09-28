/**
 * Seeds Sanity with the app's demo content. Safe to re-run: every document is
 * written with createIfNotExists against a deterministic _id.
 *
 *   npm run seed
 *
 * Reads credentials from .dev.vars (or the ambient environment).
 */
import { readFileSync } from "node:fs";
import { createClient } from "@sanity/client";
import {
  SEED_FAMILIES,
  SEED_FORUM,
  SEED_NOTIFICATIONS,
  SEED_PLAYDATES,
  SEED_RESOURCES,
  SEED_THREADS,
} from "./seedData";

try {
  for (const line of readFileSync(new URL("../.dev.vars", import.meta.url), "utf8").split("\n")) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*"(.*)"\s*$/.exec(line);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2];
  }
} catch {
  // no .dev.vars; rely on ambient env
}

const projectId = process.env.SANITY_PROJECT_ID;
const dataset = process.env.SANITY_DATASET ?? "production";
const token = process.env.SANITY_TOKEN;

if (!projectId || !token) {
  console.error("Missing SANITY_PROJECT_ID / SANITY_TOKEN. Set them in .dev.vars or the environment.");
  process.exit(1);
}

const client = createClient({
  projectId,
  dataset,
  apiVersion: "2024-10-01",
  token,
  useCdn: false,
});

const DEMO_FAMILY = {
  id: "demo-user-1",
  user_id: "demo-user-1",
  parent_name: "Demo Parent",
  location: "Cape Town",
  bio: "Parent to a wonderful 5-year-old.",
  avatar_url: null,
  family_values: ["neurodiversity-affirming", "kindness", "patience"],
  sensory_preferences: ["quiet", "small groups", "outdoors"],
  interests: ["nature", "painting", "books"],
  communication_style: "verbal",
  verified: true,
  children: [
    { name: "Sam", age: 5, diagnosis: "Autism", sensory_preferences: ["quiet"], interests: ["nature"], communication_style: "verbal" },
  ],
};

type Group = { type: string; rows: Record<string, any>[] };

const groups: Group[] = [
  { type: "family", rows: [...SEED_FAMILIES, DEMO_FAMILY] },
  { type: "playdate", rows: SEED_PLAYDATES },
  { type: "forumPost", rows: SEED_FORUM },
  { type: "resource", rows: SEED_RESOURCES },
  { type: "thread", rows: SEED_THREADS },
  { type: "notification", rows: SEED_NOTIFICATIONS },
];

let created = 0;
for (const group of groups) {
  for (const row of group.rows) {
    const { id, ...rest } = row;
    await client.createIfNotExists({ _id: `${group.type}.${id}`, _type: group.type, ...rest });
    created += 1;
  }
  console.log(`  ${group.type}: ${group.rows.length}`);
}

const total = await client.fetch<number>("count(*[_id != '_.internal'])");
console.log(`Seeded ${created} documents. Dataset now holds ${total} documents.`);

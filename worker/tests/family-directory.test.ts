import assert from "node:assert/strict";
import test from "node:test";
import { loadFamilyDirectory } from "../../frontend/src/family-directory";

const missing = { status: 404 };
function transport(overrides: Record<string, any> = {}) {
  return {
    list: async () => { throw missing; },
    playdates: async () => [{ host_family_id: "a" }, { host_family_id: "a" }, { host_family_id: "b" }, { host_family_id: "c" }],
    family: async (id: string) => ({ id, verified: id !== "c", parent_name: id, interests: ["soccer"], children: [{ name: "Child", age: id === "a" ? 5 : 9, diagnosis: "private" }], email: "private@example.com" }),
    missingEndpoint: (error: unknown) => error === missing,
    ...overrides,
  };
}
test("modern family directory does not call legacy routes", async () => {
  const families = [{ id: "modern", approximate_location: { latitude: -33.92, longitude: 18.42 } }];
  const result = await loadFamilyDirectory(transport({ list: async () => families, playdates: async () => { throw new Error("Must not call legacy endpoint"); } }));
  assert.deepEqual(result, { families, limited: false });
});
test("missing directory falls back to unique verified playdate hosts", async () => {
  const calls: string[] = [];
  const base = transport();
  const result = await loadFamilyDirectory(transport({ family: async (id: string) => { calls.push(id); return base.family(id); } }));
  assert.deepEqual(calls, ["a", "b", "c"]);
  assert.deepEqual(result.families.map(family => family.id), ["a", "b"]);
  assert.equal(result.limited, true);
  assert.equal(result.families[0].distance_km, null);
  assert.equal(result.families[0].approximate_location, null);
  assert.equal(result.families[0].email, undefined);
  assert.equal(result.families[0].children[0].diagnosis, undefined);
});
test("legacy results honor age, interest and search filters", async () => {
  assert.deepEqual((await loadFamilyDirectory(transport(), { age_min: 4, age_max: 6, interest: "SOCCER", q: "a" })).families.map(family => family.id), ["a"]);
  assert.equal((await loadFamilyDirectory(transport(), { interest: "music" })).families.length, 0);
});
test("authentication and server/network failures are not hidden by fallback", async () => {
  for (const error of [{ status: 401 }, { status: 500 }, new Error("Offline")]) {
    await assert.rejects(loadFamilyDirectory(transport({ list: async () => { throw error; }, playdates: async () => { throw new Error("Must not fall back"); } })), received => received === error);
  }
});
test("inaccessible individual families can be skipped", async () => {
  const base = transport();
  const result = await loadFamilyDirectory(transport({ family: async (id: string) => id === "a" ? null : base.family(id) }));
  assert.deepEqual(result.families.map(family => family.id), ["b"]);
});
test("legacy transport failures remain actionable errors", async () => {
  const error = new Error("Offline");
  await assert.rejects(loadFamilyDirectory(transport({ family: async () => { throw error; } })), received => received === error);
});

import { createClient, type SanityClient } from "@sanity/client";
import type { Env } from "./env";

export type Doc = Record<string, unknown>;

/**
 * Every logical collection becomes a Sanity document type. The document `_id`
 * is `${type}.${logicalId}` so the API can index on the native `_id` index and
 * recover the original id (e.g. "fam-sarah") without a separate field.
 */
const T = {
  family: "family",
  playdate: "playdate",
  joinRequest: "joinRequest",
  forumPost: "forumPost",
  resource: "resource",
  savedResource: "savedResource",
  thread: "thread",
  notification: "notification",
  // "block" is a reserved Sanity type name (rich text), so the safety-block
  // collection is stored as safetyBlock.
  safetyBlock: "safetyBlock",
  report: "report",
} as const;

function ref(type: string, logicalId: string): string {
  return `${type}.${logicalId}`;
}

/** Strips Sanity bookkeeping fields and re-derives `id` from `_id`. */
function toApi(doc: Doc | null): Doc | null {
  if (!doc) return null;
  const out: Doc = {};
  for (const [key, value] of Object.entries(doc)) {
    if (key.startsWith("_")) continue;
    out[key] = value;
  }
  if (typeof doc._id === "string") {
    const dot = doc._id.indexOf(".");
    out.id = dot === -1 ? doc._id : doc._id.slice(dot + 1);
  }
  return out;
}

function toApiList(docs: Doc[] | null): Doc[] {
  return (docs ?? []).map((doc) => toApi(doc) as Doc);
}

function client(env: Env): SanityClient {
  return createClient({
    projectId: env.SANITY_PROJECT_ID,
    dataset: env.SANITY_DATASET,
    apiVersion: env.SANITY_API_VERSION,
    // useCdn:false keeps read-after-write consistent (e.g. create then GET).
    // The free plan allows 250k API requests/month, ample at this scale.
    useCdn: false,
    token: env.SANITY_TOKEN,
  });
}

export const repo = {
  // ---------------- families ----------------
  familyByUserId: async (env: Env, userId: string): Promise<Doc | null> =>
    toApi(
      await client(env).fetch(
        '*[_type == $type && user_id == $userId][0]',
        { type: T.family, userId },
      ),
    ),

  familyById: async (env: Env, id: string): Promise<Doc | null> =>
    toApi(await client(env).fetch("*[_id == $id][0]", { id: ref(T.family, id) })),

  createFamily: async (env: Env, data: Doc): Promise<void> => {
    const { id, ...rest } = data;
    await client(env).create({ _id: ref(T.family, String(id)), _type: T.family, ...rest });
  },

  patchFamilyByUserId: async (env: Env, userId: string, patch: Doc): Promise<void> => {
    const doc = await client(env).fetch(
      '*[_type == $type && user_id == $userId][0]{_id}',
      { type: T.family, userId },
    );
    if (!doc) return;
    await client(env).patch(doc._id).set(patch).commit();
  },

  // ---------------- playdates ----------------
  listPlaydates: async (env: Env, category?: string): Promise<Doc[]> => {
    // Only pass the category param when set: an undefined param is
    // interpolated into the GROQ query string and Sanity rejects it.
    if (category) {
      return toApiList(
        await client(env).fetch(
          '*[_type == $type && category == $category] | order(date asc)',
          { type: T.playdate, category },
        ),
      );
    }
    return toApiList(
      await client(env).fetch("*[_type == $type] | order(date asc)", {
        type: T.playdate,
      }),
    );
  },

  playdateById: async (env: Env, id: string): Promise<Doc | null> =>
    toApi(await client(env).fetch("*[_id == $id][0]", { id: ref(T.playdate, id) })),

  createPlaydate: async (env: Env, data: Doc): Promise<void> => {
    const { id, ...rest } = data;
    await client(env).create({
      _id: ref(T.playdate, String(id)),
      _type: T.playdate,
      ...rest,
    });
  },

  patchPlaydate: async (env: Env, id: string, patch: Doc): Promise<void> => {
    await client(env).patch(ref(T.playdate, id)).set(patch).commit();
  },

  // ---------------- join requests ----------------
  createJoinRequest: async (env: Env, data: Doc): Promise<void> => {
    const { id, ...rest } = data;
    await client(env).create({
      _id: ref(T.joinRequest, String(id)),
      _type: T.joinRequest,
      ...rest,
    });
  },

  pendingJoinRequest: async (
    env: Env,
    playdateId: string,
    userId: string,
  ): Promise<Doc | null> =>
    toApi(
      await client(env).fetch(
        '*[_type == $type && playdate_id == $playdateId && user_id == $userId && status == "pending"][0]',
        { type: T.joinRequest, playdateId, userId },
      ),
    ),

  latestJoinRequest: async (
    env: Env,
    playdateId: string,
    userId: string,
  ): Promise<Doc | null> =>
    toApi(
      await client(env).fetch(
        '*[_type == $type && playdate_id == $playdateId && user_id == $userId] | order(created_at desc)[0]',
        { type: T.joinRequest, playdateId, userId },
      ),
    ),

  listPendingJoinRequests: async (env: Env, playdateId: string): Promise<Doc[]> =>
    toApiList(
      await client(env).fetch(
        '*[_type == $type && playdate_id == $playdateId && status == "pending"] | order(created_at asc)',
        { type: T.joinRequest, playdateId },
      ),
    ),

  countPendingJoinRequests: async (env: Env, playdateId: string): Promise<number> =>
    (await client(env).fetch(
      'count(*[_type == $type && playdate_id == $playdateId && status == "pending"])',
      { type: T.joinRequest, playdateId },
    )) as number,

  /** Fetch one request by id, scoped to its playdate. Any status. */
  joinRequestById: async (
    env: Env,
    requestId: string,
    playdateId: string,
  ): Promise<Doc | null> =>
    toApi(
      await client(env).fetch(
        '*[_type == $type && _id == $id && playdate_id == $playdateId][0]',
        { type: T.joinRequest, id: ref(T.joinRequest, requestId), playdateId },
      ),
    ),

  patchJoinRequest: async (env: Env, id: string, patch: Doc): Promise<void> => {
    await client(env).patch(ref(T.joinRequest, id)).set(patch).commit();
  },

  // ---------------- forum ----------------
  listForumPosts: async (env: Env): Promise<Doc[]> =>
    toApiList(
      await client(env).fetch('*[_type == $type] | order(hours_ago asc)', {
        type: T.forumPost,
      }),
    ),

  forumPostById: async (env: Env, id: string): Promise<Doc | null> =>
    toApi(
      await client(env).fetch("*[_id == $id][0]", { id: ref(T.forumPost, id) }),
    ),

  // ---------------- resources ----------------
  listResources: async (env: Env): Promise<Doc[]> =>
    toApiList(
      await client(env).fetch('*[_type == $type] | order(_createdAt asc)', {
        type: T.resource,
      }),
    ),

  resourceById: async (env: Env, id: string): Promise<Doc | null> =>
    toApi(await client(env).fetch("*[_id == $id][0]", { id: ref(T.resource, id) })),

  listSavedResources: async (env: Env, userId: string): Promise<Doc[]> =>
    toApiList(
      await client(env).fetch(
        '*[_type == $type && user_id == $userId] | order(saved_at desc)',
        { type: T.savedResource, userId },
      ),
    ),

  saveResource: async (env: Env, userId: string, resourceId: string, savedAt: string) => {
    await client(env).createIfNotExists({
      _id: ref(T.savedResource, `${userId}.${resourceId}`),
      _type: T.savedResource,
      user_id: userId,
      resource_id: resourceId,
      saved_at: savedAt,
    });
  },

  unsaveResource: async (env: Env, userId: string, resourceId: string): Promise<void> => {
    await client(env).delete(ref(T.savedResource, `${userId}.${resourceId}`));
  },

  // ---------------- threads ----------------
  listThreads: async (env: Env): Promise<Doc[]> =>
    toApiList(
      await client(env).fetch('*[_type == $type] | order(_createdAt asc)', {
        type: T.thread,
      }),
    ),

  threadById: async (env: Env, id: string): Promise<Doc | null> =>
    toApi(await client(env).fetch("*[_id == $id][0]", { id: ref(T.thread, id) })),

  threadByFamilyAndInitiator: async (
    env: Env,
    familyId: string,
    initiatorId: string,
  ): Promise<Doc | null> =>
    toApi(
      await client(env).fetch(
        '*[_type == $type && family_id == $familyId && initiator_id == $initiatorId][0]',
        { type: T.thread, familyId, initiatorId },
      ),
    ),

  createThread: async (env: Env, data: Doc): Promise<void> => {
    const { id, ...rest } = data;
    await client(env).create({ _id: ref(T.thread, String(id)), _type: T.thread, ...rest });
  },

  patchThread: async (env: Env, id: string, patch: Doc): Promise<void> => {
    await client(env).patch(ref(T.thread, id)).set(patch).commit();
  },

  // ---------------- notifications ----------------
  listNotifications: async (env: Env): Promise<Doc[]> =>
    toApiList(
      await client(env).fetch('*[_type == $type] | order(_createdAt asc)', {
        type: T.notification,
      }),
    ),

  markAllNotificationsRead: async (env: Env): Promise<void> => {
    const c = client(env);
    const ids = await c.fetch<string[]>("*[_type == $type]._id", {
      type: T.notification,
    });
    if (ids.length === 0) return;
    await c.mutate(
      ids.map((id) => ({ patch: { id, set: { unread: false } } })),
    );
  },

  // ---------------- safety ----------------
  listBlocks: async (env: Env, userId: string): Promise<Doc[]> =>
    toApiList(
      await client(env).fetch('*[_type == $type && user_id == $userId]', {
        type: T.safetyBlock,
        userId,
      }),
    ),

  upsertBlock: async (env: Env, data: Doc): Promise<void> => {
    const { id, ...rest } = data;
    await client(env).createIfNotExists({
      _id: ref(T.safetyBlock, String(id)),
      _type: T.safetyBlock,
      ...rest,
    });
  },

  removeBlock: async (env: Env, id: string): Promise<void> => {
    await client(env).delete(ref(T.safetyBlock, id));
  },

  blockId: (userId: string, targetFamilyId: string): string =>
    `${userId}.${targetFamilyId}`,

  createReport: async (env: Env, data: Doc): Promise<void> => {
    const { id, ...rest } = data;
    await client(env).create({ _id: ref(T.report, String(id)), _type: T.report, ...rest });
  },
};

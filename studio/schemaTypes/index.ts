import { family } from "./family";
import { forumPost } from "./forumPost";
import { joinRequest } from "./joinRequest";
import { notification } from "./notification";
import { playdate } from "./playdate";
import { report } from "./report";
import { resource } from "./resource";
import { safetyBlock } from "./safetyBlock";
import { savedResource } from "./savedResource";
import { thread } from "./thread";

/**
 * The document types the Worker in ../worker reads and writes. Keep the field
 * names in sync with worker/scripts/seedData.ts: the API serves documents
 * verbatim, so a renamed field disappears from the mobile client's response.
 */
export const schemaTypes = [
  family,
  playdate,
  joinRequest,
  forumPost,
  resource,
  savedResource,
  thread,
  notification,
  safetyBlock,
  report,
];

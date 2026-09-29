import { defineConfig } from "sanity";
import { structureTool } from "sanity/structure";
import { schemaTypes } from "./schemaTypes";

/**
 * Content model for the WaddlePlay app.
 *
 * The Cloudflare Worker in ../worker reads and writes these exact document
 * types, and derives the API `id` from the document id: a document stored as
 * `playdate.pd-park` is served as `id: "pd-park"`. Nothing here is read from
 * the Studio itself, so editing content here changes what the mobile app
 * shows on the next API call.
 *
 * The document id is therefore the public id of the record. Renaming or
 * recreating a document changes the id the app uses, so prefer editing an
 * existing document over replacing it.
 */
export default defineConfig({
  name: "waddleplay",
  title: "WaddlePlay",
  projectId: process.env.SANITY_STUDIO_PROJECT_ID ?? "yaogb63o",
  dataset: process.env.SANITY_STUDIO_DATASET ?? "production",
  plugins: [structureTool()],
  schema: { types: schemaTypes },
});

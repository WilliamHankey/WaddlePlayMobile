import { defineCliConfig } from "sanity/cli";

/**
 * The Studio is a plain Vite SPA talking to the same project the Worker uses.
 * `studioHost` is set so `sanity deploy --yes` never has to ask for a hostname.
 */
export default defineCliConfig({
  api: {
    projectId: process.env.SANITY_STUDIO_PROJECT_ID ?? "yaogb63o",
    dataset: process.env.SANITY_STUDIO_DATASET ?? "production",
  },
  // Stable application id, so `sanity deploy` never re-registers the app.
  deployment: {
    appId: "vqyaj5i48pr1abbtqk9lpl6e",
  },
  studioHost: process.env.SANITY_STUDIO_HOST ?? "waddleplay",
});

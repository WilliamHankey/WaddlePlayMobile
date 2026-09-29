# WaddlePlay

Parent-to-parent playdate matching app: Expo (React Native) mobile client with a
Cloudflare Worker API backed by Sanity (app data) and Cloudflare D1 (auth).

```
frontend/   Expo app + Android project   -> the APK
worker/     Hono API on Cloudflare Workers
studio/     Sanity Studio, hosted on *.sanity.studio
backend/    Original FastAPI + MongoDB service, kept only as a reference
```

## Live services

| What | Where |
| --- | --- |
| API | `https://waddleplay-api.wchankey15.workers.dev` |
| Sanity | project `yaogb63o`, dataset `production` |
| D1 | `waddleplay` (users only) |
| Studio | `https://waddleplay.sanity.studio/` (Sanity-hosted, free tier) |
| APK | build artifact of the `Android APK` GitHub workflow |

Sign in with `demo@waddleplay.com` / `password123`. The Studio is only reachable
for accounts that are members of the Sanity project; the dataset itself is
private and unreadable without a token.

## Backend

Sanity holds every app document; D1 holds only `users`, because the Sanity free
plan only supports public datasets and password hashes must stay private.

```bash
cd worker
npm install
cp .dev.vars.example .dev.vars     # SANITY_TOKEN, JWT_SECRET (+ project/dataset)
npm run db:migrate:local
npm run db:migrate:remote
npm run seed                       # idempotent demo content
npm run dev                        # http://127.0.0.1:8787
npm run typecheck
npm run deploy
```

Contract tests (create a throwaway account, then delete it again):

```bash
npm run smoke -- http://127.0.0.1:8787
npm run cleanup        # Sanity: smoke families/playdates/notifications + seeded threads
npm run cleanup:d1     # D1: the smoke-test users
```

`npm run smoke` is read-mostly but does write, so always follow it with
`npm run cleanup` when pointing it at the production dataset.

## Studio

The content model lives in `studio/schemaTypes/`. Editing a document there
changes what the mobile app shows on its next API call, because the Worker
serves documents verbatim.

```bash
cd studio
npm install
npm run dev      # http://localhost:3333
npm run build
npm run deploy   # publishes to waddleplay.sanity.studio
```

`sanity deploy` also uploads the schema manifest, which is what makes the
project show up in the Sanity dashboard. Two things to keep in mind:

- A document's `_id` is its public API id: `playdate.pd-park` is served as
  `id: "pd-park"`. Renaming or recreating a document changes the id the app
  uses, so edit documents instead of replacing them.
- `block` is a reserved Sanity type name (rich text), which is why the safety
  block collection is `safetyBlock`. Renaming it back makes schema validation
  fail and `sanity deploy` refuse the schema.

## Free APK pipeline

Builds run on GitHub-hosted runners via local Gradle, so there is no EAS quota
and no local Android SDK needed. A signed release APK takes about 45 minutes.

One-time setup (already done for this repository):

1. Set repository variable `BACKEND_URL` to the Worker URL.
2. Run the `Bootstrap release keystore` workflow once and add its four outputs
   as repository secrets, or generate a key locally and set them by hand:
   `ANDROID_KEYSTORE_BASE64`, `ANDROID_STORE_PASSWORD`, `ANDROID_KEY_ALIAS`,
   `ANDROID_KEY_PASSWORD`.
3. Back up the keystore and its passwords somewhere safe. GitHub secrets cannot
   be read back, so the runner never needs them again once they are set.

Then, for every new APK:

```bash
gh workflow run android-apk.yml
gh run download --name waddleplay-apk
```

Pushing a `v*` tag builds the same APK and attaches it to the GitHub release.
The built APK is signed with the release key when the secrets are present and
falls back to the debug key otherwise (such a build cannot upgrade an existing
install).

Two Windows-specific traps are already handled in the workflow: `gradlew` needs
its executable bit (`git update-index --chmod=+x`), and `setup-android@v3` is
skipped because it tries to install the removed `tools` package.

## Pointing the app elsewhere

`EXPO_PUBLIC_BACKEND_URL` decides which API the app talks to. It is read from
`frontend/.env` locally and written by the workflow on CI, so a build always
targets the URL in the `BACKEND_URL` repository variable. The value is baked
into the JS bundle at build time, which is why the APK must be rebuilt after it
changes.

## Local development

```bash
cd frontend
yarn install
EXPO_PUBLIC_BACKEND_URL=http://127.0.0.1:8787 yarn start
```

Android debug builds still allow cleartext traffic, so a local HTTP Worker
works during development; release builds do not.

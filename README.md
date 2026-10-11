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

Sanity holds content documents. D1 keeps authentication, operational notification
records, coarse locations, and community-review submissions private regardless
of the content dataset's access mode.

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

## Mobile integrations (free-tier setup)

The new routes are implemented locally; deployment is separate. No exposed chat token is used by the implementation or tests.

- **Email changes:** `POST /api/auth/email` requires the current password, prevents duplicate accounts, and revokes older sessions. This changes a sign-in address; it does **not** prove ownership of the new mailbox or send verification email.
- **Discussions:** authenticated `POST /api/forum` writes a validated Sanity `forumPost` with the actual account author. Compose and error/success states are wired into the mobile Forum sheet.
- **Verification:** new accounts start unverified. Introductions, consent, reviewer identity, and decisions are stored privately in D1. Allowlisted administrators review at `/admin/verification`; only approval changes the Sanity badge and unlocks joining/hosting. This is manual community review, **not government-ID verification or a background check**. Do not collect ID photos. Existing verified accounts are preserved.
- **Location:** Expo foreground location permission or manually selected coordinates; only coordinates rounded to 0.01 degrees are stored/shared. Nearby filtering uses actual distances and Leaflet/OpenStreetMap with attribution. No paid map key or background tracking. OpenStreetMap's public tiles require fair use; do not bulk-download/offline-prefetch tiles. Location sharing can be removed in Settings.
- **Notifications:** per-user in-app inbox, preferences, devices, and a retry/receipt outbox in D1. A five-minute Worker cron sends small batches through the free Expo push service. Events include chat requests/replies, acceptance, playdate join requests/decisions, and verification decisions. Lock-screen alerts contain no private message text. Expo/APNs/FCM receipts are provider acknowledgements, not guaranteed device delivery. No email notifications or scheduled event reminders are implemented.

Before running the new Worker:

```bash
cd worker
npm run db:migrate:local       # includes 0003_mobile_integrations.sql
npm test                     # Node 22.14+: real in-memory SQLite, mocked Sanity/Expo; no production writes
npm run typecheck
# When ready to deploy:
npm run db:migrate:remote
npx wrangler secret put SANITY_TOKEN   # rotated server-side token; never EXPO_PUBLIC_*
npx wrangler secret put ADMIN_USER_IDS # comma-separated D1 account IDs, not emails
# Optional if Expo Push Security is enabled:
npx wrangler secret put EXPO_ACCESS_TOKEN
npm run deploy
```

Publish the edited local Studio schema separately (`cd studio && npm run deploy`). New private D1 tables must exist before the Worker is deployed. Do not run the old demo smoke script against production to verify these features: it predates unverified signups.

For **free Android push**, create a Firebase project on the Spark plan and register `com.waddleplay.app`. Put the Firebase client `google-services.json` in `frontend/android/app/` locally; for GitHub APK builds, set repository secret `GOOGLE_SERVICES_JSON` to its JSON contents. Upload the **FCM v1 service-account credential** to the existing Expo project through Expo/EAS Credentials; never put that credential in the mobile bundle or repository. Test on a physical device using a rebuilt development/release APK, not Expo Go. The workflow still builds without Firebase configuration but warns that native push cannot work. Enable notifications from the designed Settings sheet to request device permission and register the token.

In-app notifications and web maps remain free without Firebase. Expo web push is not implemented. Publishing iOS push requires Apple's developer/APNs credentials, which may require a paid Apple membership; use Android for a no-membership-cost deployment. All free services have quotas; this does not auto-upgrade any account or enable paid products.

Security: keep the Sanity dataset private if it contains existing private chats or sensitive family fields. Worker authorization cannot protect records exposed directly by a public dataset. Legacy email/diagnosis content and legacy threads without participant IDs need a separate data audit; they are not silently migrated or deleted. Chat/notification routes are now account-scoped, and legacy threads without identifiable participants are not served.

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

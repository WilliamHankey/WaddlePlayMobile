# Waddle Play — PRD

## Vision
Waddle Play helps parents of autistic and neurodivergent children arrange safe, verified playdates with **matched** families who understand their child's needs.

## Features shipped

### Auth & shell
- Splash screen with WaddlePlay logo (color-blocks + wordmark) shown while auth resolves.
- Email/password auth (JWT). Demo: `demo@waddleplay.com / password123`.
- **TopBar on every tab**: logo (tap → Home), notification bell (→ /notifications), settings gear (→ /settings), avatar (→ profile).

### 4 bottom tabs
- **Home** — greeting, 4-tile quick-nav grid (Forum, Resources, Playdates, Explore), Nearby Playdates feed sorted by match score, trust strip.
- **Explore** — sub-tabs **List** and **Map**. Map is a static image with absolute-positioned match-score pins (74%, 78%, 88%, 96%, 60%). Tapping a pin opens a bubble with title, host, location, match pill, **View** button → detail, and a close X.
- **Playdates** — sub-tabs **Upcoming** and **Past** with row cards (image + age pill + confirmed badge + details).
- **Messages** — 4 seeded threads (Sarah / James & Priya / Emma / Lisa) with unread badges. Tap → Chat interface with bubbles, "Verified" chip, send input, avatar → family profile.

### Stack (from tabs / top-bar)
- **Playdate detail** — join / block / report, host card links to family profile.
- **Family detail** — chips, match score, block/unblock, report.
- **Forum** — 5 seeded discussions with topic filters + search.
- **Resources** — 5 seeded resources with featured carousel + kind filters (Articles/Guides/Videos).
- **Notifications** — 5 seeded items (join accepted, new match, forum reply, verification, new guide) + Mark all read.
- **Settings** — user card + Edit, Verification, Private profile toggle, push/email toggles, Notification history, Location toggle, Language, Appearance, Blocked families, Report activity, Community guidelines, Help, Sign out.
- **Profile edit** — parent name, location, bio, communication style, and multi-select chips for sensory prefs, interests, family values. Saves via `PUT /api/profile/me`.

## Backend endpoints (all under /api)
- Auth: `POST /auth/signup`, `POST /auth/login`, `GET /auth/me`
- Profile: `GET/PUT /profile/me`
- Playdates: `GET /playdates`, `GET /playdates/{id}`, `POST /playdates/{id}/join`
- Families: `GET /families/{id}`
- Safety: `POST /safety/block`, `POST /safety/unblock`, `POST /safety/report`
- Forum: `GET /forum`, `GET /forum/{id}`
- Resources: `GET /resources`
- Threads: `GET /threads`, `GET /threads/{id}`, `POST /threads/{id}/messages`
- Notifications: `GET /notifications`, `POST /notifications/read-all`

## Tech
- Backend: FastAPI + Motor/MongoDB, JWT, bcrypt.
- Frontend: Expo Router (v57), React 19, expo-secure-store, tanstack/react-query, expo-image, `@react-native-vector-icons/feather`.
- Theme: sage `#5E876D`, mustard `#E9C46A`, orange `#F4A261`, dark teal `#264653` on `#F8F9FA` — all in `src/theme.ts`.

## Seed data
- 6 families in Cape Town (5 verified hosts + demo user).
- 5 playdates. 5 forum posts. 5 resources. 4 chat threads. 5 notifications.

## Out of scope (for later)
- Real-time chat (currently REST + polling via React Query invalidation)
- react-native-maps (used static map for web preview compatibility)
- Push notifications (native build only)
- Community verification workflow

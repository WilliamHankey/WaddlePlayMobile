# Waddle Play — PRD

## Vision
Waddle Play helps parents of autistic and neurodivergent children arrange safe, verified playdates with **matched** families who understand their child's needs.

## Features shipped

### Auth & shell
- Splash screen with WaddlePlay logo shown while auth resolves.
- Email/password auth (JWT). Demo: `demo@waddleplay.com / password123`.
- **TopBar on every tab**: logo, notification bell, settings gear, avatar.

### Playdate RSVP queue
- Joining a playdate creates a **pending request** (no auto-add). The host sees a "Join requests" panel on the playdate detail with each requester's family, match score, and top reasons.
- Approve moves the family into attendees; decline marks the request declined. Guests see their status live: *Request to Join → Waiting for host… → Joined ✓ / Request declined*.

### Family chat requests
- Every family profile has a **"Say hi with a friendly message"** button that opens a modal with 3 friendly preset openers (editable).
- Sending creates a thread with status=`requested`; the sender sees a *"Waiting for accept"* banner and a disabled input; the recipient sees a *"New request"* tag in the message list and Accept / Decline buttons at the bottom of the chat before the input unlocks.

### Matching (with reasons)
- Rule-based 0–100 match score + **top 3 human-readable reasons** (e.g. "outdoors", "small groups", "AAC communication", "age fits your child") returned by every playdate endpoint.
- Reasons render as chips on Home cards and inside a "Why this is a good match" card on the playdate detail.

### Playdate hosting
- **Host a playdate** screen: title, category (5 options), location, date, start/end time, min/max age, max kids, description, sensory-friendly tag pickers, interest pickers, and a **private note** visible only to host + accepted attendees.

### Saved resources
- Bookmark toggle on every Resource card (list + featured).
- New "Saved" chip filter on Resources with unread count badge.
- Preview section on the Profile page showing up to 3 saved items, empty-state guide otherwise.

### 4 bottom tabs
- **Home** — greeting, quick-nav grid (Forum, Resources, Playdates, Explore), Nearby Playdates feed sorted by match score, trust strip.
- **Explore** — List + Map sub-tabs. Map = static image with match-score pins → tap for bubble → View → detail.
- **Playdates** — Upcoming / Past sub-tabs. "+" button opens Host a playdate.
- **Messages** — 4 seeded threads with real chat UI (send appends & clears input).

### Stack destinations
Playdate detail (with match reasons + private note + join/block/report), Family detail, Forum, Resources, Notifications, Settings, Profile edit, Playdate create.

## Backend endpoints (all under /api)
- Auth: `POST /auth/signup`, `POST /auth/login`, `GET /auth/me`
- Profile: `GET/PUT /profile/me`
- Playdates: `GET /playdates`, `GET /playdates/{id}` (match_reasons, guarded private_note, request_status, is_host, pending_requests_count), `POST /playdates` (create with private_note), `POST /playdates/{id}/join` (pending request), `GET /playdates/{id}/requests` (host only), `POST /playdates/{id}/requests/{req_id}/approve`, `POST /playdates/{id}/requests/{req_id}/decline`
- Families: `GET /families/{id}`
- Safety: `POST /safety/block`, `POST /safety/unblock`, `POST /safety/report`
- Forum: `GET /forum`, `GET /forum/{id}`
- Resources: `GET /resources` (with saved flag), `POST /resources/{id}/save`, `POST /resources/{id}/unsave`, `GET /profile/saved-resources`
- Threads: `GET /threads` (adds status + is_initiator), `GET /threads/{id}`, `POST /threads/{id}/messages` (blocked while requested), `POST /threads/request` (with opening_message), `POST /threads/{id}/accept`, `POST /threads/{id}/decline`
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

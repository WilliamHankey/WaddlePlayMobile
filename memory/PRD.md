# Waddle Play — PRD (MVP)

## Vision
Waddle Play helps parents of autistic and neurodivergent children arrange safe, verified playdates with **matched** families who understand their child's needs.

## Problems solved
1. **Sensory overwhelm** — surface only sensory-friendly playdates and families up front.
2. **Understanding** — match on sensory prefs, interests, communication style, family values (not just geography).
3. **Trust/safety** — verified profiles, private by default, block & report on every profile.

## MVP features shipped
- **Auth** — Email/password signup + login (JWT, 7-day). Demo: `demo@waddleplay.com / password123`.
- **Family profile** — parent name, location, bio, children (age/diagnosis/communication style), sensory prefs, interests, family values, verification badge.
- **Nearby playdates** — 5 seeded playdates from 6 seeded families. Each card shows image, age-range pill, **% match**, host, location/date/time, attendees, "Request to Join".
- **Rule-based matching** — 0–100 score from overlap on sensory prefs, interests, family values, communication style, plus child-age fit.
- **Explore** — horizontal category chips (Sports / Art / Outdoors / Music / Sensory) + client-side search.
- **Playdate detail** — full info, sensory-friendly tags, host card (opens family profile), Request to Join + block/report host.
- **Family profile view** — chips for sensory/interests/values, match score, verified badge, **Block & Report**.
- **Messages tab** — placeholder that explains chat unlocks after mutual playdate accept (safety-first).
- **Safety** — block hides playdates from that family; report is confidential; unblock available on the family screen.

## Tech
- **Backend**: FastAPI + Motor/MongoDB, JWT, bcrypt. All routes under `/api/*`.
- **Frontend**: Expo Router (v57), React 19, expo-secure-store for token, tanstack/react-query, expo-image, @react-native-vector-icons/feather.
- **Theme**: sage green primary `#5E876D`, mustard `#E9C46A`, orange `#F4A261`, dark teal text `#264653` — sourced from `src/theme.ts`.

## Seed data
- 6 families in Cape Town.
- 5 playdates: Gentle Soccer, Quiet Art & Creativity, Quiet Nature Walk, Sensory Music Jam, Indoor Sensory Playroom.

## Out of scope for MVP
- Real-time messaging
- Push notifications
- Community verification workflow (verified flag is default true for seeded families)
- Forum / Resources tabs (from screenshot 1)

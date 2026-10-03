# EcoBike

Cycling app for Pasto and Nariño, Colombia. Riders record rides with GPS, earn points only for verified bike rides, keep a daily streak, complete random daily missions, compete in a weekly league with friends, plan greener bike routes (Eco ruta) and redeem points for rewards at partner stores. Partner stores validate redemption codes by QR. One administrator panel manages stores, users, points and roles.

One codebase ships the iOS app, the Android app and the web app, against one Firebase project. The app content is in Spanish. This document is in English.

## Architecture

```
iOS app ─┐
Android ─┼── one Expo Router codebase (React Native + React Native Web)
Web ─────┘     │
               │  local-first: every ride is saved on the device first
               ├── SQLite (iOS, Android) / localStorage (web)
               │     ride summaries apart from GPS tracks
               │
               ├── Firebase client SDK ─────────────► Firestore
               │     reads; own profile fields only     (rules: deny by default,
               │     (no value can be written here)       server-only value fields)
               │
               ├── Firebase Auth (email, Google, Apple) ──► ID token
               │
               ├── /api/* on Vercel (Bearer ID token) ──► Firebase Admin SDK
               │     rides, redeem, users, stores,         └─ Firestore, Auth, Storage
               │     validate, friends, me, messages,         (every write of value)
               │     export, sessions, account
               │
               ├── Cloud Storage: avatars (owner), store logos (admins)
               │
               ├── Photon (komoot): place search for Eco ruta
               ├── Valhalla (FOSSGIS): bicycle routing for Eco ruta
               └── OpenStreetMap tiles (web map) / Apple Maps, Google Maps (native)
```

- **Vercel** hosts the web build (`dist/`) and runs `api/*.js` as serverless functions next to it. The mobile apps call the same endpoints through `EXPO_PUBLIC_API_URL`.
- **Firebase** (`ecobike-9dedd`) provides Auth, Firestore and Cloud Storage for all three platforms.

The paradigm is **local-first client, authoritative server for value**:

- **On the device:** the app records and shows everything offline.
- **On the server:** points, roles, redemptions, the store catalog and the public profile are decided only by `api/*.js` through the Admin SDK.
- **Back to the device:** the server's verdict replaces whatever the device computed.

The architecture rules (15 decisions, each with what it binds and the divergence it prevents) are in [docs/architecture/spine.md](docs/architecture/spine.md). [docs/architecture.md](docs/architecture.md) has the longer narrative, and [docs/architecture/review-2026-10.md](docs/architecture/review-2026-10.md) the review that produced the rules.

## Features

| Area | What it does |
| --- | --- |
| Inicio | Greeting, weekly goal, points badge, daily missions, streak, next reward, last ride, CO₂ saved |
| Map | Full-screen map with one round EcoBike button that opens three ride modes. **Libre:** free ride. **Eco ruta:** search a place near you, get a greener bike route that avoids unpaved roads, preview alternatives, then follow it turn by turn with off-route detection and recalculation. **Entrenamiento:** your own km or time goal. Also: heading arrow on web, locate button, background tracking, auto-pause, keep-screen-on |
| Ride verification | Server-side bike detection on a downsampled GPS track (speed profile, GPS jumps, distance cap), daily caps, reason shown when a ride earns nothing |
| Gamification | Verified-only achievements, current and best streak, three random daily missions per user and day, levels, weekly league |
| Progreso | Period comparison, trend, habits, environmental impact, heatmap, records, achievements |
| Premios | Search with a "can redeem" chip, 3D coverflow carousel with company logos as stamps, "how it works" sheet, press-and-hold redemption, QR code, my codes |
| Amigos | Exact-username search, requests, 1:1 chat with push, friend profiles, weekly/total ranking |
| Administración | KPIs; store CRUD with logo upload; user search, detail, role (partner with store), points adjustment with a written reason, suspend, rename, delete; audit history; code validation for partners |
| Perfil and Ajustes | Edit profile, notifications, privacy ("hide me from search"), biometric unlock, sign out everywhere, data export, resync, help, legal |
| Onboarding and guest mode | Goal personalization for new accounts; guest mode with realistic example data |

## Stack

### Languages

| Language | Where |
| --- | --- |
| TypeScript (strict) | App code, services, stores, domain rules, tests |
| TSX | Screens and components |
| JavaScript (CommonJS) | Vercel functions in `api/` |
| Firebase rules language | `firestore.rules`, `storage.rules` |
| JSON | `firestore.indexes.json`, `vercel.json`, `eas.json` |

### Client

| Technology | Use | Reason |
| --- | --- | --- |
| Expo SDK 57 (`expo` ~57.0.26) | Build system, native modules, app config (`app.config.ts`) | One toolchain for iOS, Android and web; EAS builds |
| React Native 0.86.3, React 19.2.3 | UI runtime | Native rendering on phones |
| React Native Web 0.21 | Web rendering of the same components | The web is the same app, not a separate site |
| Expo Router 57 | File-based routing, typed routes, protected route groups (`Stack.Protected`), tabs | Deep links and auth gating without manual navigation setup |
| Reanimated 4.5 + worklets | Motion on the UI thread: springs, scroll-linked large titles, carousel, hold-to-confirm | Fluid motion without JS-thread jank |
| react-native-gesture-handler | Map sheet drag, swipe rows | Native gesture recognition |
| expo-blur, expo-linear-gradient | Liquid Glass surfaces (iOS 26 style) | Native blur and gradients, CSS backdrop-filter on web |
| react-native-svg | Charts, rings, launcher light trace | Vector drawing on every platform |
| Zustand 5 | `authStore`, `rideStore`, `settingsStore` | Small stores; works with the GPS callback outside React |
| date-fns 4 | Dates in Spanish | Tree-shakable date formatting |
| expo-haptics | Tactile feedback | Native haptics; skipped on web until the user interacts |
| react-native-qrcode-svg | Redemption QR codes | Pure SVG, works on web too |
| expo-camera | QR scanner for partner validation | One scanner component for iOS, Android and web |
| expo-image-picker | Avatars and store logos | Same API on every platform |
| expo-local-authentication | Biometric unlock of an existing session | Local unlock only, never identity |
| expo-notifications | Push and weekly reminders | Native only (web gets no-op stubs) |
| @sentry/react-native | Client error reporting | Crash and error visibility with request ids |

### Maps, location and routing

| Technology | Use | Reason |
| --- | --- | --- |
| expo-location + expo-task-manager | Foreground and background GPS, mocked-location filter | Rides keep recording with the screen off |
| expo-maps (alpha) | Apple Maps (iOS), Google Maps (Android) with clean styles | First-party Expo maps |
| Leaflet 1.9 + react-leaflet 5 | Web map with OSM tiles, rider arrow (or dot without heading), glowing route | expo-maps has no web target; OSM needs no key |
| Photon (komoot) | Place search, ranked by distance to the rider | Free OSM geocoder; position coarsened to about 100 m |
| Valhalla (FOSSGIS) | Bicycle routing with `avoid_bad_surfaces`, `use_roads`, alternates, Spanish instructions | Free OSM router that understands unpaved surfaces |
| `utils/polyline.ts`, `utils/navigation.ts` | Route decoding, along-route distance, next maneuver, off-route (50 m), arrival (30 m) | Small pure functions, unit tested |

### Data

| Technology | Use | Reason |
| --- | --- | --- |
| Firestore | `usuarios`, `usuarios_public`, `usernames`, `tiendas`, rides and redemption codes under each user, `chats`/`messages`, `admin_logs`, `rate_limits` | One database for all platforms |
| Cloud Storage | `avatars/{uid}/` (owner), `stores/{storeId}/` (admins only, public read) | Images next to the data |
| Firebase Auth | Email/password, Google, Apple; revocable sessions | Managed identity |
| expo-sqlite | Local rides (summaries and tracks), achievements, redemptions on iOS/Android | Offline-first storage with in-place migrations |
| localStorage | Same API on web, one key per GPS track, in-memory summary cache | No SQLite on web |
| Firebase JS SDK 12.19 | Client reads and profile writes | One SDK for all platforms |
| firebase-admin 13 | Every write of value, in transactions | Bypasses rules only on the server |

The schema, collections, rules and endpoints are documented in [docs/database.md](docs/database.md).

### Server and cloud

| Service | Use | Reason |
| --- | --- | --- |
| Vercel (Node 24) | Web hosting and 11 serverless functions in `api/` | Same origin for web, one deploy; no Firebase Cloud Functions needed |
| Firebase (Auth, Firestore, Storage) | Identity and data | Managed, with security rules |
| Sentry (`@sentry/node`) | Server error reporting with request ids | Errors traceable from a user report |
| EAS Build | iOS and Android binaries (development, preview, production profiles) | Cloud builds for both stores |
| GitHub Actions | CI on every push and pull request | Nothing merges red |

## Ride verification and economy

| Rule | Value | Where |
| --- | --- | --- |
| Points per km | 5 | `rideScore.ts` and `api/_lib.js` |
| Bonus per real ride | 5, only for 1 km or more and 5 minutes or more | both |
| Minimum distance | 500 m | both |
| Bike detection | At least 60% of moving time at 7–50 km/h | both |
| GPS jumps | Over 80 km/h between fixes counts as a jump; more than 200 m of jumps earns 0 | both |
| Credited distance | Never more than the track shows plus 10% | both |
| Average speed | Over 45 km/h is rejected | server |
| Daily caps | 150 points and 20 rides per rolling 24 h, server time | both (server decides) |
| Track | At most 800 samples, analyzed and discarded; fixes outside the ride window are dropped; duplicate or out-of-order fixes are skipped | both |
| First redemption | Requires 3 verified rides and a verified email for password accounts | server |
| Redemption limits | 1 per 24 h; the same reward once every 7 days; price read from the store document | server |
| Fake GPS | Android mocked locations are ignored on the device | client |

A ride is **verified** when it passed bike detection, even if a cap left it at 0 points. Achievements, missions, streaks and the 3-ride redemption gate count verified rides only. Rides stored before verification existed are not counted. The client and server copies of the scoring rules are kept identical by a parity test.

## Security

| Control | Implementation |
| --- | --- |
| Server-only value | Points, league, rides, codes, roles, `cuentaActiva`, friendships, usernames, chats, stores and audit logs are written only by `api/*.js` (Admin SDK). `firestore.rules` defaults to deny |
| One path for points | `applyPoints` in `api/_lib.js` updates balance, public mirror and league together; a test fails if any handler writes these fields directly |
| Token checks | Every API call sends a Firebase ID token, verified with revocation checks (`verifyIdToken(token, true)`) |
| Admin authorization | `requireAdmin` / `isAdminUser` on the server; the client guard (`AdminOnly`) is only UX |
| Audit | Every admin or partner write goes to `admin_logs` (who, what, target, before/after, reason), including writes whose Auth step fails; deletion logs carry no personal data |
| Public profiles | `usuarios_public` can be read only by id (no list queries), so profiles can't be enumerated. Username search goes through `/api/friends`, which honors "hide me from search". Friend lists are not public. The server writes the mirror through a validated projection (`projectPublic`) |
| Rate limits | `rate_limits/{uid}` (server-only): data export once every 10 minutes, friend requests every 5 seconds. Chat is capped at 20 messages per minute, and pending friend requests at 100 |
| Admin safety | Points can only be changed with a written reason and the balance the admin saw (stale edits get 409). An admin can't demote, suspend or delete themself. Demoting revokes old admin claims |
| Uploads | Avatars: owner only, images under 5 MB, deletable. Store logos: admins only (Storage checks the role in Firestore), PNG/JPG/WebP under 2 MB, required for every new store |
| Store deletion | Refused while partners are assigned or customers hold unused codes |
| Personal data | Emails travel in request bodies, never URLs or logs. On web, signing out uploads pending rides and then clears local GPS history |
| Secrets | `EXPO_PUBLIC_*` values are public client config. The service account key and the Sentry server DSN exist only as Vercel environment variables |
| Test session | The Playwright test session exists only in the `dist-e2e` build (`EXPO_PUBLIC_E2E=1`). Builds use `--clear` so it can't leak into production, and it can't pass server token checks anyway |

[docs/security.md](docs/security.md) has the full endpoint list and the privacy model.

## Quality

| Practice | State |
| --- | --- |
| Type checking | `npm run typecheck` (TypeScript strict) |
| Unit and API tests | 172 tests with `node:test` (`npm test`). They cover domain rules (scoring, verification, streaks, missions, navigation, polyline, routing ranking, rewards mapping, week keys) and the web storage contract. API handlers run end to end on an in-memory Firebase Admin (`api/_fake-admin.cjs`): users, stores, redeem, rides, friends, me, export, validate, plus the single-points-writer guard |
| Parity tests | Device and server give the same score, caps and league week for the same input (`scoreParity.test.ts`) |
| Rules tests | `firebase/firestore.rules.test.mjs` on the Firestore emulator (CI; locally needs Java) |
| End-to-end tests | Playwright, phone and desktop projects, 22 tests. `e2e/smoke.spec.ts` covers a guest tour of every screen. `e2e/flows.spec.ts` runs on a test build with `/api`, Photon and Valhalla mocked and Firebase hosts blocked: admin panel, real redemption (success, limit then retry, insufficient points) and Eco ruta |
| Continuous integration | `.github/workflows/ci.yml`: typecheck, unit tests, web build, iOS and Android bundles, `expo-doctor`, rules emulator tests, both web builds and Playwright |
| Code review | Independent review passes (adversarial, edge cases, verification gaps, intent alignment) with findings triaged before merge |
| Monitoring | Sentry on client and server; every API response carries `X-Request-Id` |
| Accessibility | Labels and roles, screen-reader alternative to press-and-hold, VoiceOver announcements for turns, reduced-motion support, Android back closes overlays |

## AI-assisted engineering

| Tool | Use |
| --- | --- |
| Claude Code | Codebase analysis, implementation, verification in the browser and terminal |
| BMad Method | Code review (adversarial, edge-case, verification-gap and intent lenses run as independent agents), architecture spine with a reviewer gate, generated API and end-to-end tests, triage of findings |

Agents draft plans and code. Changes are verified with typecheck, tests and the browser before commit, and reviewed by a person before production.

## Decisions and tradeoffs

| Decision | Alternative considered | Gain | Cost |
| --- | --- | --- | --- |
| One Expo Router codebase for iOS, Android and web | Separate web app (Next.js) and native apps | One set of screens, rules and tests; features ship everywhere at once | Web bundle is large (about 6.7 MB); some native-only features (push, native map arrow) differ on web |
| Local-first storage (SQLite / localStorage) | Online-only Firestore reads | Rides record and display with no network; instant stats | Two copies of ride data to reconcile; sync logic and tests needed |
| Server is the only writer of value (Vercel + Admin SDK) | Client writes guarded by Firestore rules only | Fraud resistance: prices, points and limits can't be faked; complex rules (caps, transactions) in code | Every value action needs the API; a 12-function limit on Vercel Hobby (11 used) |
| Vercel functions instead of Firebase Cloud Functions | Cloud Functions (needs the Blaze plan) | Same deploy as the web; no paid Firebase plan | Two platforms to operate; Hobby is non-commercial and has a function cap |
| Scoring rules duplicated on device and server, held by a parity test | Server-only scoring | Finish screen shows the real result offline | Two copies to change together |
| Bike detection by speed profile of a downsampled track | Device attestation (App Check, Play Integrity) or sensor fusion | No extra native module; works on web | A modified client can fabricate a plausible track; App Check is the next step |
| Verified flag stored by the server | Deriving "verified" from points > 0 | Capped rides still count; rejected and legacy rides don't | One more field to migrate locally (SQLite column added in place) |
| Ride summaries stored apart from GPS tracks | One record with the whole track | Lists and stats never parse tracks; web survives a full quota | Callers must load the full ride (`getRide`) before saving |
| Incremental remote pull (last week) | Full history download on each start | Fewer reads and faster start | A ride deleted on another device stays here until server reconciliation exists |
| Public profile readable only by id; search through the API | Client list queries on `usuarios_public` | Profiles can't be enumerated; "hide me" is enforced | One function call per search; old app versions can't search until updated |
| Per-user rate limits in a Firestore collection | Redis, Vercel KV or firewall rules | No new service; atomic in a transaction | One extra read and write per limited call |
| Admin logos uploaded directly to Storage, checked by role in Firestore | Upload through an API route | No 4.5 MB function body limit; no function used | Cross-service rules (Storage reads Firestore); orphan files if an editor is abandoned |
| Audit log in Firestore (`admin_logs`) | External logging service | Visible in the admin user detail; no new service | Retention policy still to define |
| expo-maps on native, Leaflet on web | react-native-maps everywhere | First-party native maps, OSM on web with no key | expo-maps is alpha; no rotated arrow on native yet |
| Free Photon and Valhalla servers | Paid geocoding/routing or self-hosting | No keys, no cost, understands unpaved roads | No SLA; fair-use limits (Valhalla about 1 request per second per user) |
| Press-and-hold to redeem | Two-step confirmation dialog | One deliberate gesture, fewer taps and less text | Needs a screen-reader alternative (provided) |
| Lime #7BF510 only for functional state, neutral surfaces, motion over color | Green accents everywhere | Calm, legible UI | Categories no longer differ by color |
| Paired platform files (`name.ts` / `name.web.ts`) | `Platform.OS` branches in services | Web never imports native-only modules (no NetInfo polling, no notifications on web) | Two files to keep in sync per service |

## Security model

| Actor | Can do | Mechanism |
| --- | --- | --- |
| Guest | Use the app with demo data stored on the device | No account; demo points and codes never reach the server |
| Rider (signed in) | Record rides; earn server-awarded points; redeem; chat with friends; edit own name, photo and search visibility; export or delete own data | ID token on every API call; rules allow only own allowlisted fields |
| Partner | Validate codes of its own store only | `role: partner` + `storeId`, checked in `api/validate.js`; every confirmation audited |
| Administrator | Manage stores, users, roles, points (with reason) and suspensions; upload store logos | `role: admin` (or legacy `isAdmin` / `admin` claim), checked on the server for every call; audited |
| Firebase client SDK | Read the catalog, own private data and other public profiles by id | `firestore.rules`, default deny |
| Server (Admin SDK) | Full access | Only in `api/*.js` on Vercel, with the service account in an environment variable |

## Repository structure

```
app/                         Expo Router screens
  (auth)/                      welcome, login, register, forgot-password
  (tabs)/                      home, map, stats, points (Premios), friends, profile
  settings/                    settings, edit-profile, help, maintenance, delete-account
    admin/                       index (dashboard), store (editor), user (detail)
  ride/[id].tsx                ride detail with map, profile, splits, reason
  chat/[uid].tsx, friend/[uid].tsx, points/my-codes.tsx, history.tsx, onboarding.tsx, legal/[doc].tsx
src/
  components/
    ui/                          Liquid Glass primitives, tab bar, sidebar, large titles, motion
    map/                         RideMap.native/.web, RideLauncher, EcoRoutePanel/Preview, TrainingPanel, NavBanner, MapSheet
    rewards/                     RewardsBrowser, RewardCarousel, RedeemSheet, HoldToConfirm, StoreLogo, RewardsInfoSheet
    admin/                       AdminOnly guard
  services/                    api, firebase, auth, rides (sync), rewards, social, routing, admin,
                               db.native/db.web, push/push.web, reminders/.web, connectivity/.web, e2e
  stores/                      authStore, rideStore (GPS state machine), settingsStore
  hooks/, theme/, types/
  utils/                       rideScore, verified, gamification, missions, streak, navigation, polyline, geo, week...
    __tests__/                   unit, parity and storage contract tests
api/                         Vercel functions (11): account, export, friends, me, messages, redeem,
                             rides, sessions, stores, users, validate
  _lib.js                      auth, scoring, caps, applyPoints, projectPublic, rateLimit, audit, deletion
  _fake-admin.cjs, _*.test.mjs  in-memory Firebase Admin and handler tests (not deployed)
e2e/                         Playwright: smoke.spec.ts (prod build), flows.spec.ts (test build)
firebase/                    firestore.rules, firestore.indexes.json, storage.rules, rules tests (emulator)
docs/                        architecture spine and review, database, security, deployment, development, environment
scripts/                     serve-dist.mjs, build-web-e2e.mjs, test alias loader
firebase.json
vercel.json, eas.json, app.config.ts
.github/workflows/ci.yml
```

## Local setup

Requirements:
- Node.js 22 or later, and npm.
- Java 21, only for the rules emulator tests.
- A Firebase project for real accounts. Without one, the app runs in demo mode.

```bash
npm install
```

```bash
npx expo start
```

Press `w` for web, or open the project in a development build on iOS/Android. To enable accounts and sync, copy `.env.example` to `.env` and fill in the Firebase values ([docs/environment.md](docs/environment.md)).

| Command | Purpose |
| --- | --- |
| `npm start` | Expo dev server |
| `npm run ios` / `npm run android` | Native development builds |
| `npm run web` | Web dev server |
| `npm run typecheck` | TypeScript check |
| `npm test` | Unit, parity, storage and API handler tests |
| `npm run test:rules` | Firestore rules on the emulator (needs Java) |
| `npm run build:web` | Production web build to `dist/` (clean cache) |
| `npm run build:web:e2e` | Test build with the e2e session to `dist-e2e/` (never deployed) |
| `npm run test:e2e` | Playwright against both builds (run both builds first) |
| `npm run deploy:rules` | Firestore rules, indexes and Storage rules to `ecobike-9dedd` |

## Environment variables

| Variable | Scope | Purpose |
| --- | --- | --- |
| `EXPO_PUBLIC_FIREBASE_*` (API key, auth domain, project id, storage bucket, sender id, app id) | Client (public) | Firebase web config |
| `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`, `_ANDROID_`, `_WEB_` | Client (public) | Google Sign-In |
| `EXPO_PUBLIC_API_URL` | Client (public) | Vercel deployment URL for native apps (web uses same origin) |
| `EXPO_PUBLIC_SENTRY_DSN`, `EXPO_PUBLIC_SUPPORT_EMAIL`, `EXPO_PUBLIC_APP_ENV` | Client (public) | Monitoring, support contact, environment label |
| `GOOGLE_MAPS_ANDROID_API_KEY` | Build time | Google Maps on Android |
| `FIREBASE_SERVICE_ACCOUNT_KEY` | Server (Vercel) | Admin SDK credentials (JSON) |
| `FIREBASE_STORAGE_BUCKET` | Server (Vercel, optional) | Bucket for deletions and logos |
| `SENTRY_DSN` | Server (Vercel, optional) | Server error reporting |
| `EXPO_PUBLIC_E2E` | Test build only | Enables the Playwright session; never set for real builds |

Anything secret must never use the `EXPO_PUBLIC_` prefix: those values are embedded in the app bundle.

## Deployment

Order matters, because rules must never require something the deployed API doesn't do yet:

1. **API and web:**
   ```bash
   vercel deploy --prod
   ```
   Production needs `FIREBASE_SERVICE_ACCOUNT_KEY`. Preview deployments have no server credentials.
2. **Rules and indexes**, after the API is live:
   ```bash
   npm run deploy:rules
   ```
   The first deploy asks to let Storage read Firestore (store-logo rule); accept it. New composite indexes take a few minutes to build.
3. **Mobile apps:**
   ```bash
   eas build --profile production --platform all
   ```

Keep `api/` at 12 functions or fewer on Vercel Hobby: files starting with `_` are not functions. Details in [docs/deployment.md](docs/deployment.md).

## Known limitations and next steps

- **Native rider arrow:** expo-maps has no rotated custom marker, so phones show the system location dot. Decision pending: react-native-maps, or wait for expo-maps.
- **Device attestation:** App Check on `/api/rides` would stop fabricated tracks. It needs a native module, since the Firebase JS SDK providers are web-only.
- **Web bundle size:** a large shared chunk (about 5.2 MB) needs a dependency audit before route splitting pays off.
- **Rules allowlist:** the `usuarios` update rule uses a denylist of server fields; move it to an allowlist once it can be tested on the emulator.
- **Hosting plan:** Vercel Hobby is for non-commercial use; move to Pro before a commercial launch with partner stores.
- **Routing provider:** register with FOSSGIS or self-host Photon/Valhalla before heavy use.
- **Platform upgrades:** Expo SDK 58 (React Native 0.88) once stable; firebase-admin 14 (Node 22+).

## Documentation

| File | Content |
| --- | --- |
| [docs/architecture/spine.md](docs/architecture/spine.md) | Architecture rules (AD-1 to AD-15) every change must follow |
| [docs/architecture/review-2026-10.md](docs/architecture/review-2026-10.md) | Architecture review: decisions questioned, findings and their status |
| [docs/architecture/deferred-work.md](docs/architecture/deferred-work.md) | Known issues deliberately deferred, with what would settle them |
| [docs/architecture.md](docs/architecture.md) | Design narrative, ride state machine, motion system |
| [docs/database.md](docs/database.md) | Collections, Storage paths, admin endpoints, Vercel limit |
| [docs/security.md](docs/security.md) | Endpoints, rules and privacy model |
| [docs/deployment.md](docs/deployment.md) | Web, API, rules and store releases |
| [docs/development.md](docs/development.md) | Day-to-day scripts and platform testing |
| [docs/environment.md](docs/environment.md) | Where each configuration value comes from |

## License

No license file is included: all rights reserved by the authors.

# Security & privacy

## Secrets vs. public config

Everything in `.env` / `EXPO_PUBLIC_*` is **client-side config**, not a
secret — it ships inside the app bundle on every platform, so it must never
include anything that grants access on its own:

- Firebase's `apiKey`, `authDomain`, `projectId`, etc. identify a project;
  they don't authorize access. Authorization is enforced by
  [`firestore.rules`](firestore.rules) / [`storage.rules`](storage.rules).
- Google/Apple OAuth **client IDs** are also public by design (they're
  embedded in every app that uses them); the corresponding **client
  secrets** are never used by this app (native/PKCE flows don't need them)
  and must never be added here.
- The Firebase **service account key** is the only real secret. It lives
  ONLY in the Vercel env var `FIREBASE_SERVICE_ACCOUNT_KEY` and is used by
  the server functions in [`api/`](api). Never in `.env*`, never in git.

## Authentication

- Email/password, Google, and Apple all go through Firebase Auth
  (`src/services/auth.service.ts`); this app never stores or handles raw
  passwords itself.
- Session persistence uses Firebase's React Native persistence adapter
  (`@react-native-async-storage/async-storage`), which is unencrypted local
  storage — appropriate for a session token here, but the app deliberately
  keeps nothing more sensitive than that in it.
- **Biometric unlock is not authentication.** `expo-local-authentication`
  only re-confirms the person holding the device after a real Firebase
  session already exists (`authStore` status `"locked"` → `"signedIn"`).
  Face ID/Touch ID never create or approve a session by themselves.

## Data model & authorization

One Firestore (`ecobike-9dedd`) serves web, iOS and Android. The project
has no Cloud Functions (Spark plan), so privileged logic runs as Vercel
serverless functions in [`api/`](api) with the Firebase Admin SDK:

| Endpoint | What it does |
|---|---|
| `POST /api/rides` | Validates a ride summary (speed <= 45 km/h, <= 200 km, <= 30 days old, max 20 rewarded rides/24h), computes points server-side, writes `usuarios/{uid}/rides/{id}` and `puntosAcumulados` in one transaction. Idempotent by ride id. |
| `POST /api/redeem` | Reads the price from `tiendas/{id}`, checks and deducts the balance, writes `codigos_canjeados`. |
| `POST /api/friends` | request / accept / reject / remove, writing both users atomically. |
| `GET/POST/PUT /api/stores` | Rewards catalog admin. Requires `role == "admin"` or legacy `isAdmin == true` on `usuarios/{uid}`, or an `admin` custom claim. |
| `POST /api/validate` | Store staff (role `partner`) or admin looks up a redemption code and marks it used, once. |
| `POST /api/roles` | Admin assigns `partner` / `user` / `admin` by username. |
| `POST /api/me` | After sign-in: rebuilds the public mirror from the server copy (legacy accounts), dedupes auto usernames, and changes username with a uniqueness check. |
| `DELETE /api/account` | Deletes Firestore data, public mirror, avatars, friend links and the Auth user. |

Every call sends the user Firebase ID token (`Authorization: Bearer`),
verified server-side.

[`firestore.rules`](firestore.rules) make the client unable to change
anything of value:

- `usuarios/{uid}`: owner read; owner may edit profile fields but never
  `puntosAcumulados`, `role`, `isAdmin`, `amigos`,
  `solicitudesPendientes`, `cuentaActiva`, `username`. Sign-up must start at 0 points.
- `usuarios/{uid}/rides`, `codigos_canjeados`: owner read, server write only.
- `usuarios_public/{uid}`: readable by signed-in users (search, leaderboard);
  owner may sync name/photo, points and friends come from the server.
- `tiendas`: readable by signed-in users, server write only.
- Everything else is denied.

Known ceiling: ride points are checked for plausibility, not re-measured
from GPS (the polyline stays on the device for privacy). If cheating shows
up, upload the polyline and re-measure it in `api/rides.js`.

## Local storage

- Rides/history/stats live in SQLite (native) or `localStorage` (web) keyed
  by `userId` — for a signed-out guest session this is a random per-device
  id (`useCurrentUserId`), never anything identifying.
- Settings (`useSettingsStore`) persist via `expo-secure-store` on
  native and `localStorage` on web.
- "Eliminar cuenta" calls `DELETE /api/account` (server deletes all cloud
  data and the Auth user), then wipes local data for that user.

## Location & privacy

- Foreground location permission is requested only when the person taps
  "Iniciar recorrido" — never on app launch.
- `shareLocationDuringRide` and `shareStatsWithFriends` are OFF-by-default
  settings (`types/user.ts DEFAULT_SETTINGS`); nothing is shared with other
  users until the person opts in.
- Background location (`UIBackgroundModes: ["location"]`,
  `ACCESS_BACKGROUND_LOCATION`) is declared in `app.config.ts` for
  uninterrupted tracking while the phone is locked, but is requested through
  the standard OS prompts, never silently escalated from foreground access.

## Still recommended before scaling

- Firebase App Check (blocks API abuse from non-app clients).
- Rate limiting on `/api/friends` and username search.
- A published privacy policy URL (required by both stores).

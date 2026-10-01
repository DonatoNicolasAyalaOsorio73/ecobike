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
- A Firebase **service account key** / Admin SDK credential is a real
  secret. This app never needs one — it only uses the client SDK. If a
  Cloud Function or admin script is added later, that key belongs in that
  service's own environment, never in this repo.

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

The real, deployed project (`ecobike-9dedd`) has **never had Cloud
Functions enabled** (confirmed via `firebase functions:list`), so anything
in `firestore.rules` marked "solo Cloud Functions" (`/users`, `/routes`,
`/rewards`, `/redemptions`, `/badges`) is an aspirational schema this app
does not write to. The schema this app actually reads/writes is the legacy
one already live in production:

- `usuarios/{uid}` — the real user profile (email, nombre, apellido,
  identificación, fechaNacimiento, amigos, puntosAcumulados, role, ...).
  **Owner-read-only** by design, because it holds those sensitive fields —
  this is not a bug, see below.
- `usuarios/{uid}/codigos_canjeados/{codeId}` — reward redemption codes.
  Owner can read/create; never update/delete client-side.
- `usuarios_public/{uid}` — a minimal public mirror of `usuarios/{uid}`
  (`username`, `nombre`, `apellido`, `profileImageUrl`, `puntosAcumulados`,
  `amigos` — nothing else, enforced by the rule's `hasOnly([...])`). Added
  because there's no Cloud Function to broker cross-user reads: friend
  search (`social.service.ts`) and the friends leaderboard
  (`rides.service.ts`) read this instead of `usuarios/{uid}` directly. Kept
  in sync by the owner's own client on profile edits, ride-point gains, and
  friend list changes (`auth.service.ts`'s `syncPublicMirror`).
- `tiendas/{storeId}` — the real rewards catalog. Fixed in this pass: the
  rule used to require `isActive == true`, but the live documents predate
  that field, so the catalog was unreadable for every non-admin user. It
  now treats a missing `isActive` as active (`resource.data.get('isActive',
  true) != false`).
- `canjes/{canjeId}` — a second, older redemption-history collection; owner
  read/create only.

**Known gap:** friend requests are one-directional under the real rules —
`sendFriendRequest` writes to the *recipient's* `solicitudesPendientes`,
which a plain client can't do under `allow update: if isOwner(uid)`. This
needs a Cloud Function (or a rule change accepting a narrower, validated
cross-user write) to actually deliver a request; today it will surface as
"Esta función social necesita permisos adicionales..." until that exists.
Likewise, per-friend ride history/distance isn't in the real schema at all,
so the leaderboard only ranks by the real `puntosAcumulados` balance, not
distance.

Deploy rules with `firebase deploy --only firestore:rules,storage`.

## Local storage

- Rides/history/stats live in SQLite (native) or `localStorage` (web) keyed
  by `userId` — for a signed-out guest session this is a random per-device
  id (`useCurrentUserId`), never anything identifying.
- Settings (`useSettingsStore`) persist via `expo-secure-store` on
  native and `localStorage` on web.
- "Eliminar cuenta" (`app/settings/delete-account.tsx`) wipes local ride/
  achievement data for that user **and** calls Firebase's `deleteUser`. If
  Firebase requires a recent login (its own replay-attack protection), the
  screen surfaces that and asks the person to re-authenticate rather than
  silently failing.

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

## Things a real production rollout still needs

- A security review of `firestore.rules` against your actual final data
  model once social features grow beyond what's here.
- Rate limiting / abuse protection on friend requests and username search
  (Firestore rules alone don't prevent enumeration at scale — consider App
  Check).
- An actual privacy policy + account-deletion confirmation email if you
  ship this to real users, which is a legal/product requirement this repo
  doesn't attempt to satisfy on its own.

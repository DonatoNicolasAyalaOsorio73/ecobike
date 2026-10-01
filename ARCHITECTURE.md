# Architecture

## Where this started

The repository contained a 10-file Expo SDK 51 mockup: four static screens
(Welcome, Login, Register, Forgot Password) with a "Liquid Glass" visual
style (`expo-blur` + `expo-linear-gradient` over blurred color blobs), no
backend, no navigation beyond a single stack, and no TypeScript. Everything
described below was built on top of that visual language, not instead of it.

## Key decisions and why

**Expo Router (file-based) over manual React Navigation.** Current
Expo-recommended default, gives typed routes, deep linking, and auth-gated
route groups (`Stack.Protected`) for free.

**Local-first data (SQLite native / `localStorage` web) before any backend.**
Ride tracking, history, stats, and gamification are the core of the product
(rule of thumb: functionality > everything else). They work with zero
configuration — no Firebase project, no login — so the app is usable and
demoable immediately. `src/services/db.native.ts` and `db.web.ts` share one
API; Metro picks the right file per platform automatically.

**Firebase for the backend, added on top, never required.**
`src/services/firebase.ts` exports `isFirebaseConfigured`, computed from
`EXPO_PUBLIC_FIREBASE_*` env vars. Every screen that needs a backend
(auth, social, cloud sync) checks this flag and degrades to "configure
Firebase to use this" instead of crashing or faking success. See
[ENVIRONMENT.md](ENVIRONMENT.md).

**A guest session (`authStore.continueAsGuest`) alongside real auth.**
Without it, the entire tab navigator (map/history/stats) would be
unreachable until a Firebase project exists, which contradicts "the app
should keep working when a capability isn't available." Guest and
authenticated sessions share the exact same local-first ride/stats code path
— the only difference is whether `firebaseUser`/`profile` are populated.

**`expo-maps` (native) + Leaflet/OpenStreetMap (web), behind one interface.**
`expo-maps` is Expo's current first-party Apple Maps / Google Maps wrapper —
more "Apple-first" than the older community `react-native-maps` — but it has
no web target. Rather than leave Web with a dead placeholder,
`RideMap.native.tsx` / `RideMap.web.tsx` expose the same
`{ route, center, height }` props; Metro's platform-extension resolution
picks the right one. OpenStreetMap tiles need no API key, so Web works out
of the box.

**Biometrics as a local unlock, not identity.** `expo-local-authentication`
gates re-entry into an *already-authenticated* session
(`authStore` status `"locked"`); it never substitutes for Firebase Auth. See
[SECURITY.md](SECURITY.md).

**Zustand over Context/Redux.** Three small stores (`authStore`,
`rideStore`, `settingsStore`) — no reducers/actions boilerplate needed for
this size of app, and it plays well with a mutable subscription (the GPS
watch callback in `rideStore`) that a pure-Context approach would fight.

**Gamification is data, not a pile of if-statements.**
`src/types/achievement.ts` holds a list of `{ code, title, isUnlocked(stats) }`
entries; `evaluateAchievements` just filters it. Adding an achievement means
adding one array entry, not touching ride-completion logic. Levels are a
threshold table for the same reason (`LEVEL_THRESHOLDS` in
`utils/gamification.ts`).

## Ride tracking state machine

`src/stores/rideStore.ts` implements exactly the states the spec calls for:

```
IDLE → PREPARING → ACTIVE ⇄ PAUSED → FINISHING → COMPLETED
                      ↓
                    ERROR (permission denied, etc.)
```

- Distance is accumulated incrementally per GPS fix (`utils/geo.ts`,
  haversine) and rejects fixes implying >120 km/h, which is GPS noise, not a
  real cyclist.
- The in-progress ride is autosaved to local storage every ~15s while
  active/paused, and `recoverInProgressRide(userId)` looks for one on the
  Map tab's mount — an app kill mid-ride loses at most ~15s of the track,
  not the whole ride.
- `finishRide()` computes final stats, persists the ride, evaluates
  achievements against full history, and best-effort syncs to Firestore
  (`services/rides.service.ts`) if configured — sync failure never loses the
  local copy. On a real (non-guest) account it also adds the ride's points to
  `usuarios/{uid}.puntosAcumulados`, the real shared balance the mobile app
  reads — see SECURITY.md for why the raw ride-summary sync itself has no
  real collection to land in yet (no Cloud Functions on this project).

## Motion

`src/theme/motion.ts` holds the motion tokens in Apple's vocabulary —
damping *ratio* + *response* (WWDC "Designing Fluid Interfaces") — and
converts them to the mass/stiffness/damping triplet Reanimated wants. Call
sites read as intent (`SPRING.default`, `SPRING.momentum`) instead of
tuned-by-feel constants. It also exports Apple's momentum-projection and
rubber-band functions, used by `SwipeableRow` so a swipe lands where the
gesture was *going* and resists progressively at its boundary.

Two rules learned the hard way in this codebase:

- **Only transforms/opacity go through Reanimated.** SVG geometry
  (`ProgressRing`) and text content (`AnimatedNumber`) round-trip through
  React state via `useTweenedValue`, because the compositor can't own them.
- **A shared value assigned outside an animation doesn't reliably re-run the
  style mapper on web.** Values that change without animating (a measured
  width) belong in plain style, not `useAnimatedStyle` — this is why
  `SegmentedControl` animates only `translateX` and takes its pill width
  straight from measured state.

- **Don't drive geometry from `onLayout`.** In a production web export
  (`expo export --platform web`) the callback never fired, while it did in
  the dev server — so both sliding pills (`SegmentedControl`,
  `LiquidTabBar`) rendered at width 0, i.e. invisible, in the shipped
  build only. Both now express geometry as percentages: the pill is
  `100 / count` percent wide (exactly one segment) and moves by
  `translateX: n * 100%`, a percentage of its *own* width. Nothing to
  measure, nothing to arrive late, and it stays a compositor-friendly
  transform. This is why the tab bar and segmented control have no
  horizontal padding — an inset would make those percentages resolve
  against a box wider than the segments themselves.

Verify web changes against `npx expo export --platform web` served by
`scripts/serve-dist.mjs` (the `ecobike-web-prod` launch config), not only
the dev server — the two behave differently in exactly this area.

## Production robustness

- **`ErrorBoundary`** (`src/components/ErrorBoundary.tsx`) wraps the whole
  signed-in app in `app/_layout.tsx` — an uncaught render error (a malformed
  Firestore doc, an unexpected null field) shows a recoverable Liquid Glass
  screen instead of a white-screen crash.
- **Offline detection** (`useNetworkStatus`, `@react-native-community/netinfo`)
  drives a persistent `OfflineBanner` so degraded sync/social features have
  an obvious cause instead of looking broken — same idea as Uber/DiDi's
  connectivity indicator. The same listener in `app/_layout.tsx` retries
  `syncPendingRides` the moment connectivity actually returns.
- Screens with async, potentially-failing loads (`friends.tsx`) show a
  distinct load-error card with a "Reintentar" button, separate from
  transient action feedback (search results, "solicitud enviada").
- `history.tsx` / `friends.tsx` support pull-to-refresh (`RefreshControl`)
  instead of only re-fetching on screen focus.

## What's intentionally not built yet

- **i18n.** Settings originally had an "English" toggle wired to nothing —
  removed rather than shipped as a fake control. The app is Spanish-only
  until real translated strings exist.
- **Push notifications delivery.** `expo-notifications` is installed and the
  settings toggle persists a preference, but no notification is actually
  scheduled/sent yet — there's no trigger (achievement unlocked, friend
  request, ride reminder) wired to it.
- **Route sharing.** GPS polylines stay local-only; a friend's leaderboard
  entry never exposes where they actually rode unless that's built
  deliberately with an explicit opt-in (see SECURITY.md's privacy notes).
- **Per-friend distance/ride-history on the leaderboard.** The real backend
  has no rides collection to read a friend's distance from (see SECURITY.md),
  so `fetchFriendsLeaderboard` ranks by the real `puntosAcumulados` balance
  only, mirrored via `usuarios_public/{uid}`.

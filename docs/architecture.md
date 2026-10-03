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
[environment.md](environment.md).

**A guest session (`authStore.continueAsGuest`) alongside real auth.**
Without it, the entire tab navigator (map/history/stats) would be
unreachable until a Firebase project exists, which contradicts "the app
should keep working when a capability isn't available." Guest and
authenticated sessions share the exact same local-first ride/stats code path
— the only difference is whether `firebaseUser`/`profile` are populated.

**One map contract, three free implementations.** `RideMap.types.ts` defines
the props; Metro picks the file per platform: `RideMap.web.tsx` (Leaflet +
OpenStreetMap), `RideMap.android.tsx` (MapLibre + OpenFreeMap vector tiles)
and `RideMap.native.tsx` (Apple Maps through `expo-maps`, used on iOS). None
needs an API key or a billing account. Android uses MapLibre instead of
Google Maps so it needs no key and shares the web's OSM data, route styling
and heading arrow.

**Biometrics as a local unlock, not identity.** `expo-local-authentication`
gates re-entry into an *already-authenticated* session
(`authStore` status `"locked"`); it never substitutes for Firebase Auth. See
[security.md](security.md).

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

**One screen scaffold, one layout hook.** Every top-level screen (and the
scroll-based settings/legal screens) renders through
`src/components/ui/LargeTitleScreen.tsx`: iOS 26 large title that hands off
to a compact title on a glass nav bar as you scroll, pull-to-stretch, leading
and trailing nav slots, tab-bar clearance and a centered 720 px column. All
scroll-linked styles are Reanimated worklets (UI thread, no re-renders).
Platform/size decisions live in `src/hooks/useLayout.ts`, not in screens.
The behavior itself is the `useLargeTitle` hook in the same file, so the
virtualized screens (Actividad's SectionList, Mis códigos' FlatList) and the
keyboard-avoiding form (Editar perfil) share it without giving up
virtualization or their sticky footers.

**Map panel with two detents.** `src/components/map/MapSheet.tsx`: drag to
fold the ride panel to one line or unfold it (finger-tracking, rubber-band,
momentum projection from `theme/motion.ts`); the grabber is also a button, so
the gesture is a shortcut and never the only way.

**Navigation: five tabs + avatar.** Inicio, Mapa, Progreso, Premios, Amigos.
Perfil is reached from the avatar in the nav bar (iOS 26 App Store/Music
pattern) and stays a tab route, so deep links and `backBehavior="history"`
keep working. Desktop web (>= 1024 px) swaps `LiquidTabBar` for
`DesktopSidebar` via `tabBarPosition: "left"` (same routes and tabPress
semantics); the former iPhone-frame mock-up on desktop was removed so the web
is a first-class layout, not a phone imitation. Tabs cross-fade (`animation:
"fade"`); stack screens keep the native push.

**Eco ruta uses free OSM services.** `src/services/routing.ts`: Photon
(komoot) for place search and the FOSSGIS Valhalla server for bicycle
routing (`avoid_bad_surfaces` for unpaved roads, `use_roads` for quieter
streets, alternates). Both are keyless community servers with fair-use
limits: move to self-hosted Valhalla/Photon or a paid plan before heavy use.
The route geometry is decoded client-side (`utils/polyline.ts`, tested).

**Motion over color.** Lime marks state only; shadows are neutral
(`elevation()`). Depth and delight come from motion: one entrance curve for
the whole app (`enter()` in `theme/motion.ts`, Material 3 emphasized
decelerate), scroll-driven reveal of every card inside a LargeTitleScreen
(`components/ui/Reveal.tsx`, UI-thread, re-measured on content size change),
and a shared-axis transition between tabs.

**Type ramp and press feedback as tokens.** `src/theme/typography.ts` (SF
sizes and tracking) and `src/components/ui/PressableScale.tsx` (UI-thread
spring sink, haptic, hover lift) so cards and tiles respond like buttons.

## Ride tracking state machine

`src/stores/rideStore.ts` implements exactly the states the spec calls for:

```
IDLE → PREPARING → ACTIVE ⇄ PAUSED → FINISHING → COMPLETED
                      ↓
                    ERROR (permission denied, etc.)
```

- Distance is accumulated incrementally per GPS fix (`utils/geo.ts`,
  haversine) and rejects fixes implying >80 km/h (GPS glitches), mocked
  locations, stale cached fixes and repeated timestamps.
- The in-progress ride is autosaved to local storage every ~15s while
  active/paused, and `recoverInProgressRide(userId)` looks for one on the
  Map tab's mount — an app kill mid-ride loses at most ~15s of the track,
  not the whole ride.
- `finishRide()` computes final stats, scores the ride with the same rules
  and daily caps as the server (`utils/rideScore.ts`, kept identical to
  `api/_lib.js` by `scoreParity.test.ts`), persists it, evaluates
  achievements and syncs it to `POST /api/rides`. The server is the only
  writer of points: its verdict (`pointsEarned`, `verified`, `pointsReason`)
  replaces the local one. Sync failure never loses the local copy; only a
  permanent rejection (400/403/409/413/422) zeroes a ride.
- Local storage keeps ride summaries apart from GPS tracks: lists and stats
  never parse tracks (`listRides` returns summaries, `getRide` the track).

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
  deliberately with an explicit opt-in (see security.md's privacy notes).
- **Per-friend distance/ride-history on the leaderboard.** The real backend
  has no rides collection to read a friend's distance from (see security.md),
  so `fetchFriendsLeaderboard` ranks by the real `puntosAcumulados` balance
  only, mirrored via `usuarios_public/{uid}`.

# Development

## Running

```bash
npm install
npx expo start          # then press w / i / a, or scan the QR with Expo Go
```

Demo mode (no `.env`) works on every platform. To test auth/social/cloud
sync, set up `.env` first — see [ENVIRONMENT.md](ENVIRONMENT.md).

## Testing on each platform

**Web** — `npx expo start --web`. Fastest loop for UI/logic changes; maps
fall back to Leaflet/OpenStreetMap, and Apple/Google sign-in and native maps
aren't available here by design (see ENVIRONMENT.md).

**iOS (Expo Go)** — `npx expo start`, scan the QR code with the Camera app.
Covers everything except Sign in with Apple and `expo-maps` (both need a
native build).

**Android (Expo Go)** — same as above, scan with the Expo Go app.

**Native build (EAS or local)** — needed to test Sign in with Apple and
`expo-maps`:
```bash
npx expo prebuild
npx expo run:ios       # or: eas build --profile development --platform ios
npx expo run:android
```

## Type checking & tests

```bash
npm run typecheck   # tsc --noEmit
npm test            # node:test self-checks for geo.ts / gamification.ts math
```

There's no UI test suite yet — screens are verified manually (this is a
mobile-first app; most of the value is in on-device behavior like GPS
tracking and biometrics that a unit test can't exercise). When adding
non-trivial logic (a calculation, a branch, a state transition), add it next
to the existing tests in `src/utils/__tests__/` rather than skipping
coverage — see the `node --import ./scripts/register-alias-loader.mjs`
plumbing in `package.json` if you need the `@/` import alias in a new test
file.

## Conventions

- TypeScript strict mode; avoid `any` outside genuinely justified bridges to
  a third-party type you don't own (see the comment in
  `src/components/ui/LiquidTabBar.tsx` for an example of when that's fine).
- Platform-specific files use `.native.ts(x)` / `.web.ts(x)` suffixes with
  an identical exported API (see `services/db.*` and `components/map/RideMap.*`)
  — Metro picks the right one automatically; `tsconfig.json`'s
  `moduleSuffixes` makes `tsc` do the same for typechecking.
- Firebase/social/cloud code always checks `isFirebaseConfigured`
  (`services/firebase.ts`) and degrades gracefully instead of throwing when
  it's false.
- New environment variables go in `.env.example` with a comment on where to
  get the value, and in the table in ENVIRONMENT.md.

## Releasing

Not yet configured — there's no `eas.json` build profile in this repo. Set
one up with `eas build:configure` when you're ready to produce store builds;
at minimum you'll need:

- An Apple Developer account + provisioning profile for iOS.
- A Google Play Console account + upload key for Android.
- Production Firebase config, OAuth client IDs configured for release bundle
  IDs/SHA-1 fingerprints (not just the debug ones from ENVIRONMENT.md).

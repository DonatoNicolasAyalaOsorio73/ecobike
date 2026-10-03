# Development

## Running

```bash
npm install
npx expo start          # w = web; i / a = a development build on iOS / Android
```

Demo mode (no `.env`) works on every platform with example data. To use real
accounts, sync and social features, set up `.env` first: see
[environment.md](environment.md).

## Running on each platform

**Web**: `npm run web`. Fastest loop for UI and logic. Maps use
Leaflet/OpenStreetMap; push notifications, background GPS, biometrics and
native maps are native-only by design.

**Android (emulator or device)**: the app uses native modules that Expo Go
doesn't include (`expo-maps`, background location), so run a build:

```bash
npx expo prebuild --platform android --clean   # android/ is generated, never committed
npx expo run:android                           # debug build + Metro
```

For a release build that doesn't need Metro (closest to the store app):

```bash
SENTRY_DISABLE_AUTO_UPLOAD=true npx expo run:android --variant release --no-bundler
```

`SENTRY_DISABLE_AUTO_UPLOAD=true` is required locally: release builds try to
upload source maps to Sentry and fail without a Sentry organization. EAS
profiles already set it (`eas.json`).

On Windows, set `JAVA_HOME` to Android Studio's JDK
(`C:\Program Files\Android\Android Studio\jbr`) and `ANDROID_HOME` to the SDK
(`%LOCALAPPDATA%\Android\Sdk`).

**iOS**: same as Android with `npx expo run:ios` (needs macOS and Xcode), or
a cloud build with `eas build --profile development --platform ios`.

## Checks

```bash
npm run typecheck        # TypeScript strict
npm test                 # unit, parity, storage contract and API handler tests
npm run test:rules       # Firestore rules on the emulator (needs Java 21)
npm run build:web        # production web build -> dist/
npm run build:web:e2e    # test build with the e2e session -> dist-e2e/
npm run test:e2e         # Playwright, phone and desktop (needs both builds)
```

- **Unit tests** live next to the code they test, in `__tests__/` folders:
  `src/domain/__tests__/` (business rules), `src/utils/__tests__/` (helpers),
  `src/services/__tests__/` (storage, routing) and `api/_*.test.mjs` (server). Handler tests run the
  real `api/*.js` against the in-memory Firebase Admin in `api/_fake-admin.cjs`.
- **End-to-end**: `e2e/smoke.spec.ts` (guest tour on the production build)
  and `e2e/flows.spec.ts` (signed-in flows on the test build, every external
  service mocked).
- New tests that import app code use the `@/` alias, which the loader in
  `scripts/register-alias-loader.mjs` resolves for `node --test`.

CI (`.github/workflows/ci.yml`) runs all of the above on every push to `main`
and every pull request.

## Conventions

- Follow the architecture rules in
  [architecture/spine.md](architecture/spine.md). The most common ones:
  - **Value is written only by the server.** Points, roles, codes and stores go
    through `api/*.js`; balances only through `applyPoints`.
  - **Scoring rules exist in two copies.** `src/domain/rideScore.ts` and
    `api/_lib.js` change together, and the parity test must pass.
  - **One definition of "verified".** Use `isVerified` / `verifiedRides`, never
    `pointsEarned > 0`.
- **Platform differences** go in paired files with the same exported API:
  `name.ts` (native, the default) + `name.web.ts`, or `.native.ts` + `.web.ts`.
  Metro picks the right one, and `tsconfig.json`'s `moduleSuffixes` makes `tsc` do
  the same.
- **Firebase code** checks `isFirebaseConfigured` (`services/firebase.ts`) and
  degrades gracefully.
- **New environment variables** go in `.env.example`, with a comment on where to
  get the value, and in [environment.md](environment.md).
- **Vercel functions**: a new file in `api/` is a deployed function (11 of 12
  used). Add endpoints as actions of an existing handler; helpers and tests
  start with `_`.
- **Copy that states a rule** (points per km, caps) imports the number from
  `src/domain/rideScore.ts`.
- **Style**: TypeScript strict, no `any` outside justified bridges to
  third-party types, Spanish for user-facing text, English for code and docs.

## Releasing

See [deployment.md](deployment.md). Store builds use the EAS profiles in
`eas.json` (`development`, `preview`, `production`).

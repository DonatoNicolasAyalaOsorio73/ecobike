# Environment setup

The app runs with **zero configuration** in local demo mode (tap "Explorar
sin cuenta"). Everything below is only needed to enable real accounts, cloud
sync, social features, and native-only capabilities.

## 1. Firebase (accounts, sync, friends)

1. Create a project at https://console.firebase.google.com.
2. **Build > Authentication > Sign-in method**: enable "Email/Password". For
   Google/Apple sign-in, also enable those providers here (see sections
   below — each needs its own client ID setup first).
3. **Build > Firestore Database**: create a database (any region), start in
   production mode. Then deploy this repo's rules:
   ```bash
   npm install -g firebase-tools   # if you don't have it
   firebase login
   firebase use --add              # pick your project
   firebase deploy --only firestore:rules,storage
   ```
4. **Build > Storage**: enable it (needed only if you add avatar uploads —
   `storage.rules` is already scoped for that).
5. **Project settings > General > Your apps**: add a Web app (yes, even for
   the mobile build — the Firebase JS SDK uses this config on every
   platform). Copy the config values into `.env`:
   ```bash
   cp .env.example .env
   ```
   ```
   EXPO_PUBLIC_FIREBASE_API_KEY=...
   EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=...
   EXPO_PUBLIC_FIREBASE_PROJECT_ID=...
   EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=...
   EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
   EXPO_PUBLIC_FIREBASE_APP_ID=...
   ```
   These are public client config, not secrets — see security.md.

Restart `expo start` after editing `.env` (env vars are read at bundle
time).

## 2. Google Sign-In

1. In [Google Cloud Console](https://console.cloud.google.com) for the same
   Firebase project: **APIs & Services > Credentials > Create OAuth client
   ID**, once per platform you need:
   - **Web application** → `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`
   - **iOS** (bundle id `com.justdona.EcoBike`) → `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`
   - **Android** (package `com.justdona.EcoBike`, needs your build's SHA-1) →
     `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID`
2. In Firebase Console, Authentication > Sign-in method > Google, enable it
   and paste the Web client ID as the "Web SDK configuration" client ID.
3. Without any of these set, the Google button simply doesn't render
   (`useGoogleAuth` reports `available: false`) instead of showing a broken
   button.

## 3. Sign in with Apple

Requires an Apple Developer Program membership ($99/yr) — this repo cannot
provision this for you.

1. In your Apple Developer account, enable "Sign in with Apple" capability
   for the `com.justdona.EcoBike` App ID.
2. In Firebase Console, Authentication > Sign-in method > Apple, enable it
   (Firebase needs your Services ID / team ID / key for server-side
   verification — follow Firebase's own Apple setup screen, it walks
   through generating the private key).
3. **Only works in a custom dev client / EAS build, never in Expo Go** —
   `expo-apple-authentication` is a native module. Run:
   ```bash
   npx expo prebuild
   npx expo run:ios
   ```
   or build with EAS (`eas build --profile development --platform ios`).

## 4. Maps

- **iOS**: uses Apple Maps natively via `expo-maps` — no API key needed.
- **Android**: `expo-maps`' Google Maps backend needs a Maps SDK for Android
  key. Get one in Google Cloud Console (APIs & Services > Credentials,
  restrict it to "Maps SDK for Android"), then set:
  ```
  GOOGLE_MAPS_ANDROID_API_KEY=...
  ```
  in `.env` (this one is read by `app.config.ts` at prebuild time, not by
  the app at runtime, so it doesn't need the `EXPO_PUBLIC_` prefix).
- **Web**: OpenStreetMap tiles via Leaflet — no key needed, works
  immediately.
- `expo-maps` requires a native build (same `prebuild`/`run:ios`/`run:android`
  as above) — it is not available in Expo Go.

## 5. Push notifications

Implemented: when "Notificaciones push" is on (Ajustes), the app stores the
device Expo push token in `usuarios/{uid}.pushToken` (`src/services/push.ts`)
and the server notifies friend requests and acceptances (`api/_lib.js
sendPush`). Needs a native build (not Expo Go, not web) plus credentials on EAS:

- iOS: `npx eas-cli credentials` and let EAS create the APNs key.
- Android: create a Firebase Android app with package `com.justdona.EcoBike`,
  then upload the FCM V1 service account key in `eas credentials` (Android > Push Notifications).

## 6. Support email (optional)

`EXPO_PUBLIC_SUPPORT_EMAIL` in `.env.production` adds a contact line to
the privacy policy (`/legal/privacy`).

## 7. Sentry (error monitoring)

Code is wired and stays off until a DSN exists:

1. Create a free project at sentry.io (platform: React Native). Copy the DSN.
2. App (web + mobile): add `EXPO_PUBLIC_SENTRY_DSN=<dsn>` to `.env.production`.
   Reports crashes, render errors (ErrorBoundary) and the signed-in uid only.
3. API: add `SENTRY_DSN=<dsn>` in Vercel > ecobike-demo > Environment Variables.
   Reports every 500 from `/api`.
4. Readable native stack traces (optional): create a Sentry auth token, run
   `npx eas-cli env:create --name SENTRY_AUTH_TOKEN --visibility secret`, set
   `SENTRY_ORG` / `SENTRY_PROJECT`, and delete `SENTRY_DISABLE_AUTO_UPLOAD` from `eas.json`.

## Summary: what needs what

| Feature | Works in Expo Go? | Needs |
|---|---|---|
| Tracking, history, stats, gamification | Yes | nothing |
| Email/password auth, cloud sync, friends | Yes | Firebase project |
| Google sign-in | Yes | Firebase + Google OAuth client IDs |
| Face ID / biometric unlock | Yes | device with biometric hardware |
| Sign in with Apple | **No** — dev client only | Apple Developer account + Firebase |
| Native maps (`expo-maps`) | **No** — dev client only | Android also needs a Maps API key |

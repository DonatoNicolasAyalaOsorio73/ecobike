# Deploy

One codebase, one database:

| Piece | Where | How |
|---|---|---|
| Web app + `/api` functions | Vercel project `ecobike-demo` | `vercel deploy --prod` |
| iOS / Android apps | EAS project `@justdona/EcoBike` (`com.justdona.EcoBike`) | `eas build` / `eas submit` |
| Database, auth, storage | Firebase `ecobike-9dedd` | `npm run deploy:rules` |

Mobile apps call the same `/api` on Vercel (`EXPO_PUBLIC_API_URL` in
`.env.production`), so web and mobile share points, codes and friends.

## Every release

The API (`api/`) and the rules/indexes change together with the app. After
pulling new code, redeploy both, in this order.

## Order matters

The new `firestore.rules` block clients from writing points, codes and
friendships. Deploy the API **first**, then the rules; otherwise rides and
redemptions fail until the API is live.

### 1. Web + API (Vercel)

`FIREBASE_SERVICE_ACCOUNT_KEY` is already set on the `ecobike-demo`
project (Production). Then:

```bash
npx vercel deploy --prod
```

Check: `curl -X POST https://ecobike-demo.vercel.app/api/rides` must return
`401 {"error":"Falta el token de autenticación."}`, not 404 or 500.

### 2. Firestore rules, indexes + Storage rules

Re-run this whenever `firestore.rules` or `firestore.indexes.json` change
(the chat feature needs its two composite indexes).

```bash
npm run deploy:rules
```

If Storage fails with "Failed to make request ... firebasestorage", open
Firebase Console > Storage once to initialize it, then retry, or deploy
Firestore only (rules + the code index): `npx firebase deploy --only firestore`.

### 3. Admin user

Set `role: "admin"` on your own `usuarios/{uid}` document in the Firebase
Console (clients cannot set it). "Administración" then appears in Ajustes, on
web and mobile: edit stores, make store staff `partner` (they get "Validar
códigos"), validate customer codes by typing them or with "Escanear QR"
(camera, works on phone and web).

### 4. Mobile builds (EAS)

```bash
npx eas-cli build --profile preview --platform android    # installable APK to test
npx eas-cli build --profile production --platform all     # store builds
npx eas-cli submit --platform android                     # needs Play Console service account
npx eas-cli submit --platform ios                         # needs Apple Developer account
```

`.env.production` is committed (public config only), so EAS builds pick up
Firebase and the API URL without extra setup.

## Before submitting to the stores

- Privacy policy URL: `https://ecobike-demo.vercel.app/legal/privacy` (terms: `/legal/terms`). Both are public routes of the web app.
- Push credentials (APNs, FCM V1) on EAS, see environment.md section 5.
- Sentry DSN (recommended before launch), see environment.md section 7.
- Play Console: Data safety form, background location justification video.
- App Store: Sign in with Apple is enabled because Google sign-in may appear;
  set up the Apple Developer App ID with that capability.
- Optional: Google sign-in client IDs (`EXPO_PUBLIC_GOOGLE_*`), see environment.md.
  The Google button stays hidden until they are set.

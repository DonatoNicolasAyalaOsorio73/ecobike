# Deploy

One codebase, one database:

| Piece | Where | How |
|---|---|---|
| Web app + `/api` functions | Vercel project `ecobike-demo` | `vercel deploy --prod` |
| iOS / Android apps | EAS project `@justdona/EcoBike` (`com.justdona.EcoBike`) | `eas build` / `eas submit` |
| Database, auth, storage | Firebase `ecobike-9dedd` | `npm run deploy:rules` |

Mobile apps call the same `/api` on Vercel (`EXPO_PUBLIC_API_URL` in
`.env.production`), so web and mobile share points, codes and friends.

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

### 2. Firestore + Storage rules

```bash
npm run deploy:rules
```

If Storage fails with "Failed to make request ... firebasestorage", open
Firebase Console > Storage once to initialize it, then retry, or deploy
Firestore only: `npx firebase deploy --only firestore:rules`.

### 3. Admin user

Set `role: "admin"` on your own `usuarios/{uid}` document in the Firebase
Console (clients cannot set it). The "Administrar tiendas" entry then appears
in Ajustes, on web and mobile.

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

- Privacy policy URL (both stores require it; mention location and account deletion).
- Play Console: Data safety form, background location justification video.
- App Store: Sign in with Apple is enabled because Google sign-in may appear;
  set up the Apple Developer App ID with that capability.
- Optional: Google sign-in client IDs (`EXPO_PUBLIC_GOOGLE_*`), see ENVIRONMENT.md.
  The Google button stays hidden until they are set.

# EcoBike — Next Generation

A modern, Apple-first cycling companion app: track rides with GPS, see your
stats and streaks, earn achievements, and compare progress with friends —
built with Expo, TypeScript, and a "Liquid Glass" visual language on top of
the original EcoBike brand (`#ADF14B`, leaf + bicycle mark).

This is a full rebuild of an earlier 4-screen visual mockup into a real,
working app. See [ARCHITECTURE.md](ARCHITECTURE.md) for what changed and why.

## Status

Works fully offline today, in **local demo mode**, with no account required
("Explorar sin cuenta" on the welcome screen):

- Ride tracking (start/pause/resume/finish) with live GPS distance, speed,
  duration, elevation
- Ride history, stats dashboard, gamification (points/levels/streaks/achievements)
- Settings: theme, units, privacy toggles, biometric unlock

Gated behind **your own Firebase project** (see [ENVIRONMENT.md](ENVIRONMENT.md)):
email/password + Google + Apple sign-in, cloud sync, friends/leaderboard.

Gated behind **a native build** (EAS or `expo prebuild`, not Expo Go): Sign
in with Apple, and native Apple/Google Maps via `expo-maps`. Everything else
runs in Expo Go.

## Quick start

```bash
npm install
npx expo start
```

Press `w` for web, or scan the QR code with Expo Go for iOS/Android. Web and
Expo Go work with zero configuration in demo mode.

To enable real accounts, cloud sync, and social features, copy `.env.example`
to `.env` and fill in your Firebase project — see [ENVIRONMENT.md](ENVIRONMENT.md).

## Project structure

```
app/                    expo-router screens (file-based routing)
  (auth)/                 welcome, login, register, forgot-password
  (tabs)/                 home, map, history, stats, profile
  settings/               settings, friends, delete-account
  ride/[id].tsx           ride detail
src/
  components/ui/          Liquid Glass primitives (GlassCard, GlassButton, …)
  components/map/          RideMap.native.tsx (expo-maps) / RideMap.web.tsx (Leaflet)
  services/               firebase.ts, auth.service.ts, db (SQLite/web), rides/social
  stores/                 zustand: auth, ride tracking, settings
  hooks/                  useRideTracker pieces, biometrics, Google auth, stats
  theme/                  color tokens + light/dark hook
  types/, utils/          domain types, geo math, gamification rules
```

See [ARCHITECTURE.md](ARCHITECTURE.md) for the reasoning behind these choices,
[SECURITY.md](SECURITY.md) for the security/privacy model, and
[DEVELOPMENT.md](DEVELOPMENT.md) for day-to-day scripts and testing on each
platform.

## Scripts

```bash
npm start            # expo start
npm run ios          # expo start --ios
npm run android      # expo start --android
npm run web          # expo start --web
npm run typecheck    # tsc --noEmit
npm test             # runs geo.ts / gamification.ts self-checks (node:test)
```

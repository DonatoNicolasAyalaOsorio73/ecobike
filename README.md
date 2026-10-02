# EcoBike — Next Generation

EcoBike turns urban cycling into a game: record rides with GPS, keep a daily
streak, complete daily missions, climb the weekly league with friends and
redeem points at partner stores. One Expo Router codebase ships the **iOS and
Android apps** and the **web version** (same account, same Firebase data, same
features). Visual language: Apple-style light UI with Duolingo-style motion
(3D buttons, bouncy feedback, celebrations).

On phones (native or mobile browser) it runs full screen with the floating
Liquid Glass tab bar; desktop browsers (1024 px and wider) get their own layout:
a glass sidebar and readable centered columns, with the map full-bleed.

## Features

- **Inicio:** greeting, weekly goal hero with parallax, quick actions, next
  reward progress, daily missions, week chart, last ride and CO₂ saved
- **Map:** full-screen map, glass control rail, ride options (free or
  distance/time goals), daily points goal, streak, background tracking,
  auto-pause, keep-screen-on, live stats, lesson-complete style celebration
  with level-ups and new achievements
- **Streaks and missions:** daily streak with week dots and best streak,
  daily points goal, three daily missions, weekly league with friends
- **Stats:** period comparison, trend, habits by day/hour, ride types,
  environmental impact, heatmap, records, level, achievements with progress
- **Ride detail:** framed route map, speed/altitude profile, km splits, CO₂
- **Rewards:** image carousel (scroll-snap + arrows on web), confirmation,
  QR codes, store validation with camera scanner (partner/admin roles)
- **Friends:** search, requests, real-time 1:1 chat with push, friend
  profiles, league/total ranking with podium
- **Profile and settings:** full edit profile (validation, username
  availability, birth date, bike, level, goals), notification types, privacy,
  biometric unlock, sign out everywhere, data export, resync, help, legal
- **Onboarding** for new accounts; **guest mode** with realistic example data

## Quality

- 80 unit tests (pure logic) + Firestore rules tests (emulator) + Playwright
  E2E on phone and desktop viewports, all in CI with iOS/Android bundle and
  expo-doctor checks
- Server-authoritative points, redemptions, friendships, chat and weekly
  league (Vercel functions + Firebase Admin); locked-down Firestore rules
- Accessibility labels, reduced-motion support, light theme only

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

Server functions (points, redemptions, friends, admin, account deletion)
live in `api/` and run on Vercel next to the web app; mobile calls the same
endpoints. See [DEPLOY.md](DEPLOY.md) to ship web, API, rules and the stores.

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
npm test             # unit tests: utils + api (node:test)
npm run test:rules   # Firestore rules on the emulator (needs Java)
npm run test:e2e     # Playwright E2E against dist/ (run build:web first)
npm run build:web    # expo export --platform web -> dist/
npm run deploy:rules # firestore rules + indexes + storage rules to ecobike-9dedd
```

CI (`.github/workflows/ci.yml`) runs typecheck, tests and the web build on
every push to `main` and every pull request.

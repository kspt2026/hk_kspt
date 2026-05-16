## What is this project?

Backtrace is a disaster victim tracking system built for emergency response scenarios (hackathon origin). When a disaster is declared, the system wakes citizen smartphones via silent push notification, detects whether users are inside a danger zone using GPS + polygon math, and begins uploading their coordinates to a central server. A rescue team dashboard shows all users on a live map with status indicators (DANGER / SAFE / INACTIVE) and allows operators to draw and manage danger zone polygons. Users can self-report their status through a simple two-button UI embedded in the mobile app.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Node.js, Fastify 4, TypeScript, MongoDB (Atlas/Railway), Firebase Admin SDK |
| Web Frontend (embedded UI) | React 19, Vite, TypeScript, HeroUI, Framer Motion, Iconify |
| Mobile — Cross-platform | React Native 0.81, Expo SDK 54, NativeWind v4, TypeScript |
| Mobile — Android Native | Kotlin, Android WebView, Foreground Service, DataStore Preferences |
| Admin Dashboard | React 19, Vite, JavaScript, HeroUI, Framer Motion, Leaflet (react-leaflet) |
| Push Notifications | Firebase Cloud Messaging (FCM) via firebase-admin |
| Hosting | Railway (`https://hkkspt-production.up.railway.app`) |
| Schema reference | PostgreSQL / PostGIS schema in `schema.sql` (not the active DB — MongoDB is active) |

---

## Project Structure

This is a multi-branch monorepo where each branch is a separate deployable component. The `main` branch contains only an empty init commit — all real code lives on feature branches.

```
(main branch — empty init)
├── (no source files)

(origin/backend)           — Fastify API server
├── src/
│   ├── index.ts           — Entry: registers plugins, starts inactivity cron, listens on PORT
│   ├── db.ts              — MongoDB connection + index setup
│   ├── firebase.ts        — Firebase Admin init, sendZonesUpdatedPush()
│   ├── utils.ts           — Haversine distance, WebSocket ConnectionManager
│   └── routes/
│       ├── user.ts        — GET /zones, POST /coords, POST /user-is-safe
│       ├── admin.ts       — POST/DELETE /admin/zones, GET /admin/users
│       ├── rescue.ts      — GET /ws/rescue (WebSocket)
│       └── tokens.ts      — POST /device-token
├── schema.sql             — Reference PostgreSQL/PostGIS schema (unused; MongoDB is active)
├── backupdate.md          — Client migration guide for /user-is-safe and alt field
├── .env.example           — Required env vars
├── package.json
└── tsconfig.json

(origin/frontend)          — React web UI (embedded in Android WebView via nitatsu-frontend)
├── src/
│   ├── App.tsx            — Screen router (initial / confirmed_safe / dispatch_status)
│   ├── bridge.ts          — JS↔Android bridge via window.AndroidNative / window.EmergencyBridge
│   ├── types.ts           — Screen union type, BridgeAction union type
│   └── screens/
│       ├── InitialPrompt.tsx    — "Are you safe?" two-button screen
│       ├── ConfirmedSafe.tsx    — User confirmed OK screen
│       └── DispatchStatus.tsx   — Rescue dispatch confirmation screen
├── index.html
├── vite.config.ts
└── package.json

(origin/admin-panel)       — Rescue team dashboard
├── src/
│   ├── App.jsx            — Main dashboard: user list, zone manager, WebSocket live feed
│   ├── MapComponent.jsx   — Leaflet map: user markers, danger zone polygons, draw mode
│   ├── api.js             — Fetch wrappers for all backend endpoints
│   ├── mockData.js        — Static mock data for dev/offline use
│   └── index.css / App.css
├── dist/                  — Pre-built production bundle (committed to branch)
├── vite.config.js
└── package.json

(origin/react-native-expo) — React Native Expo citizen app (cross-platform)
├── App.tsx                — Screen router + startup sequence + permission flow
├── index.js               — Entry: registers location task + RNG polyfill
├── app.json               — Expo config: Android permissions, FCM plugin, foreground service
├── src/
│   ├── api.ts             — fetchZones, registerToken, postCoords, postUserIsSafe
│   ├── constants.ts       — API base URL, task name, AsyncStorage keys
│   ├── storage.ts         — getUserId() — UUID persisted in AsyncStorage
│   ├── polygon.ts         — Point-in-polygon ray casting + isInsideAnyZone
│   ├── locationTask.ts    — Background GPS task (expo-task-manager), posts to /coords
│   ├── permissions.ts     — Notification + location permission prompts
│   ├── types.ts           — Screen union, Zone type
│   ├── components/        — Button, Card, FooterNote, MapButton, MapOverlay, SettingsButton
│   └── screens/           — IdleScreen, InitialPrompt, ConfirmedSafe, DispatchStatus
└── package.json

(origin/nitatsu-frontend)  — Android native app (Kotlin + WebView embedding frontend build)
├── app/src/main/java/com/Backtrace/
│   ├── MainActivity.kt              — WebView host, permission requests, service lifecycle
│   ├── BacktraceApp.kt             — Application class, holds EmergencyStateMachine
│   ├── bridge/EmergencyJsBridge.kt  — @JavascriptInterface: JS→Kotlin bridge
│   ├── disaster/PolygonChecker.kt   — Point-in-polygon math (Kotlin)
│   ├── location/LocationManager.kt  — FusedLocationProvider, zone entry detection
│   ├── network/ServerEventListener.kt — SSE/polling listener for server events
│   ├── service/EmergencyForegroundService.kt — Android foreground service
│   └── state/EmergencyStateMachine.kt — State machine with DataStore persistence
├── app/src/main/assets/             — Built frontend bundle (index.html + JS/CSS)
└── build.gradle.kts / settings.gradle.kts
```

---

## Getting Started

### Prerequisites

| Tool | Version | Required by |
|---|---|---|
| Node.js | ≥ 20 | backend, frontend, admin-panel |
| npm | ≥ 10 | all JS packages |
| MongoDB | Atlas or self-hosted | backend |
| Firebase project | — | backend (FCM), mobile |
| Expo CLI | ≥ 0.18 | react-native-expo |
| Android Studio | latest | nitatsu-frontend |
| JDK | 17+ | nitatsu-frontend |
| Gradle | via wrapper | nitatsu-frontend |

---

### Installation

**Backend (`origin/backend`)**

```bash
git checkout origin/backend
# or: git switch --detach origin/backend

npm install

cp .env.example .env
# Fill in .env (see Environment Variables section)

npm run dev        # development (tsx watch)
npm run build      # compile TypeScript → dist/
npm start          # run compiled output
```

**Web Frontend (`origin/frontend`)**

```bash
git switch --detach origin/frontend
npm install
npm run dev        # Vite dev server
npm run build      # production build → dist/
```

**Admin Dashboard (`origin/admin-panel`)**

```bash
git switch --detach origin/admin-panel
npm install

# Create .env with:
# VITE_API_BASE_URL=https://hkkspt-production.up.railway.app

npm run dev        # Vite dev server
npm run build      # production build → dist/
```

**React Native Expo App (`origin/react-native-expo`)**

```bash
git switch --detach origin/react-native-expo
npm install

npx expo start                 # Metro bundler + Expo Go
npx expo run:android           # build and install on Android device/emulator
npx expo run:ios               # build for iOS (Mac only)
```

**Android Native App (`origin/nitatsu-frontend`)**

```bash
git switch --detach origin/nitatsu-frontend
# Open in Android Studio, sync Gradle
./gradlew assembleDebug        # build APK
./gradlew installDebug         # install on connected device
```

> **Note:** The nitatsu-frontend branch embeds the built frontend bundle from `origin/frontend` under `app/src/main/assets/`. To update the embedded UI: build `origin/frontend` with `npm run build`, copy the `dist/` output into `app/src/main/assets/`, then rebuild the Android project.

---

### Running the project

```bash
# Backend — development
npm run dev

# Backend — production
npm run build && npm start

# Frontend (web UI) — development
npm run dev

# Admin dashboard — development
npm run dev

# React Native — start Metro
npx expo start

# React Native — Android
npx expo run:android

# Android native — debug build
./gradlew assembleDebug
```

Tests: not documented (no test files found in any branch).

---

### Environment Variables

**Backend (`.env` on `origin/backend`)**

| Variable | Required | Description | Example |
|---|---|---|---|
| `MONGODB_URI` | yes | Full MongoDB connection string | `mongodb+srv://user:pass@cluster.mongodb.net/Backtrace` |
| `FIREBASE_PROJECT_ID` | yes | Firebase project ID | `Backtrace-12345` |
| `FIREBASE_CLIENT_EMAIL` | yes | Firebase service account email | `firebase-adminsdk-xxx@Backtrace-12345.iam.gserviceaccount.com` |
| `FIREBASE_PRIVATE_KEY` | yes | Firebase service account private key (with `\n` literal escapes) | `"-----BEGIN PRIVATE KEY-----\n..."` |
| `PORT` | no | HTTP listen port (default: `3000`) | `3000` |

**Admin Dashboard (`.env` on `origin/admin-panel`)**

| Variable | Required | Description | Example |
|---|---|---|---|
| `VITE_API_BASE_URL` | yes | Backend base URL | `https://hkkspt-production.up.railway.app` |

**React Native Expo (`origin/react-native-expo`)**

No `.env` file — API base URL is hardcoded in `src/constants.ts`:
```ts
export const API = 'https://hkkspt-production.up.railway.app'
```
Change this constant to point to a different backend.

---

## How It Works

### Citizen flow (mobile app)

1. Backend sends silent FCM push with `{ data: { type: "zones_updated" } }` to all registered devices.
2. Mobile app wakes, fetches `/zones` (GeoJSON polygons for active danger areas).
3. App runs point-in-polygon check locally using ray casting.
4. If user is inside a zone: starts background GPS task, begins POSTing to `/coords` every ~15 seconds with `{ user_id, lat, lon, alt, ts }`.
5. UI switches to the safety prompt: **"Are you safe?"**
6. User taps **"I'm OK"** → app POSTs to `/user-is-safe`, stops sending coordinates.
7. User taps **"Not OK"** → app shows rescue dispatch screen, continues sending coordinates.
8. User can later tap **"I'm safe"** from the dispatch screen → POSTs to `/user-is-safe`.
9. Server marks user `INACTIVE` after 30 minutes of no pings.

User identity is anonymous — a UUID generated on first launch, persisted in AsyncStorage (`user_id` key).

### Rescue operator flow (admin dashboard)

1. Open admin dashboard, connects to backend WebSocket at `/ws/rescue`.
2. All active users appear on Leaflet map as colored markers: red = DANGER, green = SAFE, grey = INACTIVE.
3. Operator draws a danger zone polygon on the map → submits → backend stores in MongoDB + sends FCM push to all devices.
4. Danger zones appear as polygons on the map; operator can delete them.
5. Live WebSocket events update user positions and status in real time without page refresh.

### User status state machine

```
[first /coords call — user created]
         │
         ▼
      DANGER ◀────── POST /coords ──────────────────────┐
         │                                               │
         │  POST /user-is-safe                           │
         ▼                                               │
       SAFE ──────── POST /coords ──────────────────────┘
         │
         │  30 min no activity (server cron)
         ▼
     INACTIVE
```

---

## API Reference

Base URL: `https://hkkspt-production.up.railway.app`

### User / Citizen Endpoints

| Method | Path | Body | Description |
|---|---|---|---|
| `GET` | `/zones` | — | Returns active danger zones as GeoJSON polygons |
| `POST` | `/coords` | `{ user_id, lat, lon, alt, ts }` | Upload GPS ping; creates user if new; sets status DANGER |
| `POST` | `/user-is-safe` | `{ user_id }` | Mark user SAFE; broadcasts status change over WebSocket |
| `POST` | `/device-token` | `{ user_id, token }` | Register FCM/Expo push token for silent push delivery |

### Admin Endpoints

| Method | Path | Body | Description |
|---|---|---|---|
| `POST` | `/admin/zones` | `{ polygon }` | Create danger zone (GeoJSON Polygon); triggers push to all devices |
| `DELETE` | `/admin/zones/:zone_id` | — | Deactivate danger zone; triggers push to all devices |
| `GET` | `/admin/users` | — | All users with status, last_seen, and last 10 GPS pings |

### WebSocket

| Path | Direction | Events |
|---|---|---|
| `/ws/rescue` | server → client | `{ type: "ping", user_id, lat, lon, alt, ts, status: "DANGER" }` |
| `/ws/rescue` | server → client | `{ type: "status_change", user_id, status: "SAFE" \| "INACTIVE" }` |

No authentication on any endpoint — not documented as implemented.

---

## Branch Map

| Branch | Purpose | Status | Notable changes vs `main` |
|---|---|---|---|
| `main` | Empty init commit | skeleton only | no source files |
| `backend` | Fastify REST + WebSocket API server | active | full server codebase, MongoDB, Firebase FCM |
| `frontend` | React web UI (embedded in Android WebView) | active | Vite/React app, JS↔Android bridge |
| `admin-panel` | Rescue operator web dashboard | active | Leaflet map, live WebSocket, zone drawing tool |
| `react-native-expo` | Cross-platform citizen mobile app (Expo) | active | Expo SDK 54, background GPS, push notifications |
| `nitatsu-frontend` | Android-native citizen app (Kotlin + WebView) | active | Android foreground service, Kotlin state machine, embeds frontend build |

---

### Branch Details

#### `backend`

- **Purpose**: Central API server. Handles all data — user locations, danger zones, safe confirmations. Broadcasts real-time updates to rescue dashboard over WebSocket. Sends FCM silent push on zone changes.
- **Status**: Active. Latest commit adds explicit `/user-is-safe` endpoint and altitude (`alt`) field to `/coords`. See `backupdate.md` for the client migration guide.
- **Key stack**: Fastify 4, TypeScript, MongoDB (active), Firebase Admin SDK
- **Key files**: `src/index.ts`, `src/routes/user.ts`, `src/routes/admin.ts`, `src/routes/rescue.ts`
- **Inactivity cron**: Runs every 5 minutes; marks users INACTIVE after 30 min no pings; broadcasts `status_change` events.
- **How to run**: `npm run dev` (requires `.env` with MongoDB + Firebase credentials)
- **Deployed at**: `https://hkkspt-production.up.railway.app` (Railway)
- **Reference**: `git switch --detach origin/backend`

#### `frontend`

- **Purpose**: Minimal React UI with three screens (initial prompt, confirmed safe, dispatch status). Designed to run inside Android WebView — communicates with Kotlin host via `window.AndroidNative` / `window.EmergencyBridge` JS bridge.
- **Status**: Active. Merged into `react-native-expo` (the merge commit is visible in git log).
- **Key files**: `src/App.tsx`, `src/bridge.ts`, `src/screens/`
- **Bridge contract**: Android injects `window.AndroidNative.postMessage(action, payload)`. Web registers `window.EmergencyBridge` handlers for Kotlin to call back.
- **How to run**: `npm run dev` (Vite dev server — bridge calls silently no-op outside Android)
- **Reference**: `git switch --detach origin/frontend`

#### `admin-panel`

- **Purpose**: Web dashboard for rescue operators. Shows all users on a Leaflet map with live status, lists users in a side panel with filter tabs (All / Danger / Safe / Inactive), and lets operators draw and submit danger zone polygons.
- **Status**: Active. Pre-built `dist/` is committed to the branch (hosting prep).
- **Key files**: `src/App.jsx`, `src/MapComponent.jsx`, `src/api.js`
- **Notable**: `node_modules/.vite/deps/` is committed to the branch (non-standard — avoids build step on deploy).
- **Required env**: `VITE_API_BASE_URL` pointing to the backend.
- **How to run**: `npm run dev`
- **Reference**: `git switch --detach origin/admin-panel`

#### `react-native-expo`

- **Purpose**: Cross-platform citizen mobile app. Handles background GPS tracking, FCM silent push, zone polygon checking, and the emergency status UI. Android-first but iOS-compatible via Expo managed workflow.
- **Status**: Active. Most recent commits add altitude support and zone map UI.
- **Key files**: `App.tsx`, `src/locationTask.ts`, `src/api.ts`, `src/polygon.ts`
- **User identity**: Anonymous UUID in AsyncStorage — no login.
- **Background GPS**: `expo-task-manager` + `expo-location` background task. Fires only when user is inside an active zone and hasn't marked themselves safe.
- **Altitude**: `expo-location` `coords.altitude` — falls back to `0` if null.
- **How to run**: `npx expo start` → scan QR with Expo Go, or `npx expo run:android`
- **Reference**: `git switch --detach origin/react-native-expo`

#### `nitatsu-frontend`

- **Purpose**: Pure Android native implementation of the citizen app. Kotlin host app loads the built `origin/frontend` bundle inside an Android WebView. Implements the same emergency flow natively with a Kotlin state machine, foreground service for background GPS, and FusedLocationProvider.
- **Status**: Active. Parallel to `react-native-expo` — two different approaches to the same Android app.
- **Key files**: `app/src/main/java/com/Backtrace/state/EmergencyStateMachine.kt`, `MainActivity.kt`, `bridge/EmergencyJsBridge.kt`
- **State machine states**: `IDLE → DISASTER_ACTIVE → WAITING_CONFIRMATION → HELP_DECLINED / SOS_ACTIVE → SOS_CANCELLED`
- **Confirmation timeout**: 60 seconds in `WAITING_CONFIRMATION` → auto-transitions to `SOS_ACTIVE` if no user response.
- **State persistence**: `androidx.datastore` (survives process kill).
- **How to run**: Open in Android Studio → sync Gradle → Run on device/emulator.
- **Reference**: `git switch --detach origin/nitatsu-frontend`

---

## Deployment

**Backend**: Deployed on [Railway](https://railway.app). Live URL: `https://hkkspt-production.up.railway.app`. Railway auto-detects Node.js, runs `npm start` (compiled output). Set the four environment variables in Railway's service settings.

**Admin Dashboard**: Static files from `origin/admin-panel/dist/`. Can be deployed to any static host (Vercel, Netlify, Railway static deploy). Set `VITE_API_BASE_URL` before building.

**Frontend (web UI)**: Built output goes into `origin/nitatsu-frontend/app/src/main/assets/`. Not deployed as a standalone web app.

**React Native (Expo)**: Build with `eas build --platform android` (Expo Application Services) or `npx expo run:android` for local APK. Requires FCM configuration in Firebase Console and Expo project setup in `app.json`.

**Android Native (nitatsu-frontend)**: Build APK with `./gradlew assembleRelease` and distribute manually or via Play Store.

No CI/CD pipeline is documented in any branch.

---

## Known Issues & Limitations

- **No authentication**: All API endpoints are publicly accessible. No API keys, tokens, or auth middleware on any route.
- **Admin panel security**: `/admin/zones` (create/delete) and `/admin/users` have no access control.
- **Schema mismatch**: `schema.sql` defines a PostgreSQL/PostGIS schema. The active backend uses MongoDB. The SQL schema is kept as a reference artifact only.
- **Two parallel mobile apps**: `origin/react-native-expo` and `origin/nitatsu-frontend` implement the same Android citizen app in two different tech stacks. Which one is the production target is not documented.
- **`node_modules` committed**: `origin/admin-panel` has `node_modules/.vite/deps/` committed — unconventional, likely for hosting-prep deploy convenience.
- **Frontend API URL hardcoded**: `origin/react-native-expo/src/constants.ts` hardcodes the Railway URL. No `.env` support.
- **No test suite**: No test files found in any branch.
- **Push token management**: FCM tokens are registered per `(user_id, token)` pair but there is no deregistration flow.
- **`alt` field migration**: Clients on older versions of the Expo app will omit `alt` — backend accepts `0` as fallback per `backupdate.md`.

---

## Contributing

Branch naming convention: not formally documented. Observed pattern — descriptive flat names (`backend`, `frontend`, `admin-panel`, `react-native-expo`, `nitatsu-frontend`).

Commit style: not formally documented. Observed prefixes: `feat:`, `fix:`, `chore:`, `upd:`, `docs:`, `move:`, `Add:`.

PR process: not documented. One merged PR visible in git log (`mango-db` → `backend`).

Each component lives on its own branch. Cross-branch changes require manual file copy (e.g., updating the frontend build inside `nitatsu-frontend`).

---

_Documentation generated by Claude Code on 2026-05-16._
_Re-run the discovery prompt after major changes to keep this file up to date._

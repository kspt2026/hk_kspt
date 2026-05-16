# RescueGrid

RescueGrid is a real-time disaster victim tracking system built for emergency response. When a disaster is declared, the platform wakes citizen smartphones via silent push notification, checks whether each user is inside a danger zone using GPS and local polygon math, and streams their coordinates to a rescue operator dashboard. Operators see all users on a live map, draw and manage danger zones, and watch user status update in real time. Citizens confirm their safety through a two-button mobile UI. This repository is structured as a multi-branch project — each branch is a separate deployable component.

## Tech Stack

| Layer | Technology |
|---|---|
| Backend API | Node.js, Fastify 4, TypeScript |
| Web UI (embedded in Android) | React 19, Vite, TypeScript, HeroUI, Framer Motion |
| Admin Dashboard | React 19, Vite, JavaScript, HeroUI, Leaflet |
| Mobile — cross-platform | React Native 0.81, Expo SDK 54, NativeWind v4, TypeScript |
| Mobile — Android native | Kotlin, Android WebView, Foreground Service |
| Database | MongoDB (Atlas) |
| Push Notifications | Firebase Cloud Messaging via Firebase Admin SDK |
| Hosting | Railway |

## Prerequisites

| Tool | Min version | Required by |
|---|---|---|
| Node.js | 20 | backend, frontend, admin-panel |
| npm | 10 | all JS components |
| MongoDB | Atlas or self-hosted | backend |
| Firebase project | — | backend (FCM push), mobile apps |
| Expo CLI | 0.18 | react-native-expo |
| Android Studio | latest stable | nitatsu-frontend |
| JDK | 17 | nitatsu-frontend |

## Installation

Each component lives on its own branch. Clone the repo once, then switch to the branch for the component you want to run.

**Backend**

```bash
git clone https://github.com/kspt2026/hk_kspt.git
cd hk_kspt
git switch --detach origin/backend

npm install

cp .env.example .env
# fill in the required values — see Environment Variables below
```

**Admin Dashboard**

```bash
git switch --detach origin/admin-panel
npm install
# create a .env file — see Environment Variables below
```

**React Native (Expo) mobile app**

```bash
git switch --detach origin/react-native-expo
npm install
```

**Android native app**

```bash
git switch --detach origin/nitatsu-frontend
# open the project root in Android Studio and sync Gradle
```

## Environment Variables

**Backend (`origin/backend`)**

| Variable | Required | Description |
|---|---|---|
| `MONGODB_URI` | yes | Full MongoDB connection string |
| `FIREBASE_PROJECT_ID` | yes | Firebase project ID |
| `FIREBASE_CLIENT_EMAIL` | yes | Firebase service account email |
| `FIREBASE_PRIVATE_KEY` | yes | Firebase service account private key — use `\n` literals for newlines |
| `PORT` | no | HTTP listen port, defaults to `3000` |

**Admin Dashboard (`origin/admin-panel`)**

| Variable | Required | Description |
|---|---|---|
| `VITE_API_BASE_URL` | yes | Backend base URL, e.g. `https://hkkspt-production.up.railway.app` |

**React Native Expo (`origin/react-native-expo`)**

No `.env` file. The backend URL is hardcoded in `src/constants.ts` — edit that constant to point at a different backend.

## Running locally

**Backend**

```bash
# development (hot reload)
npm run dev

# production
npm run build
npm start
```

**Admin Dashboard**

```bash
# development
npm run dev

# production build
npm run build
```

**React Native (Expo)**

```bash
# start Metro bundler (scan QR with Expo Go)
npx expo start

# build and run on Android
npx expo run:android

# build and run on iOS (Mac only)
npx expo run:ios
```

**Android native**

```bash
# debug build
./gradlew assembleDebug

# install on connected device
./gradlew installDebug
```

## APIs & Integrations

| Service | Purpose | Docs |
|---|---|---|
| MongoDB Atlas | Stores users, location pings, danger zones, and device tokens | https://www.mongodb.com/docs/atlas |
| Firebase Cloud Messaging | Silent push to wake citizen apps when danger zones change | https://firebase.google.com/docs/cloud-messaging |
| Railway | Backend hosting and deployment | https://docs.railway.app |
| Expo Location | Background GPS tracking on the mobile app | https://docs.expo.dev/versions/latest/sdk/location |
| Expo Notifications | FCM push token registration and notification handling | https://docs.expo.dev/versions/latest/sdk/notifications |
| Expo Task Manager | Defines the background GPS task that runs when the app is closed | https://docs.expo.dev/versions/latest/sdk/task-manager |

## How to test

```bash
# no test suite present in any branch
# not documented
```

No test files were found in any branch of this repository.

## Branches

| Branch | Purpose | Status |
|---|---|---|
| `main` | Repository root with shared documentation | active |
| `backend` | Fastify REST API and WebSocket server — central data layer for the entire system | active |
| `frontend` | React web UI (three screens: safe / not safe / dispatch) designed to run embedded inside an Android WebView | active |
| `admin-panel` | Rescue operator dashboard with a live Leaflet map, user status list, and danger zone drawing tool | active |
| `react-native-expo` | Cross-platform citizen mobile app built with Expo — background GPS, push notifications, and the full emergency status flow | active |
| `nitatsu-frontend` | Android-native implementation of the citizen app in Kotlin, loading the `frontend` build inside a WebView with a native foreground service and state machine | active |

---
_Generated by Claude Code on 2026-05-16._

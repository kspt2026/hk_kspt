# Backtrace

Backtrace is a real-time disaster victim tracking system built for emergency response. When a disaster is declared, the platform wakes citizen smartphones via silent push notification, checks whether each user is inside a danger zone using GPS and local polygon math, and streams their coordinates to a rescue operator dashboard. Operators see all users on a live map, draw and manage danger zones, and watch user status update in real time. Citizens confirm their safety through a two-button mobile UI. This repository is structured as a multi-branch project - each branch is a separate deployable component.

## Tech Stack

| Layer                        | Technology                                                |
| ---------------------------- | --------------------------------------------------------- |
| Backend API                  | Node.js, Fastify 4, TypeScript                            |
| Web UI (embedded in Android) | React 19, Vite, TypeScript, HeroUI, Framer Motion         |
| Admin Dashboard              | React 19, Vite, JavaScript, HeroUI, Leaflet               |
| Mobile - cross-platform      | React Native 0.81, Expo SDK 54, NativeWind v4, TypeScript |
| Mobile - Android native      | Kotlin, Android WebView, Foreground Service               |
| Database                     | MongoDB (Atlas)                                           |
| Push Notifications           | Firebase Cloud Messaging via Firebase Admin SDK           |
| Hosting                      | Railway                                                   |

## How to test

**Admin Dashboard**

```bash
https://hk-kspt.vercel.app/
```

**React Native (Expo) mobile app**

```bash
git switch --detach origin/react-native-expo
npm install

npx expo start

npx expo run:android
```

**Android native app**

```bash
git switch --detach origin/nitatsu-frontend
# open the project root in Android Studio and sync Gradle and build .apk file
```

## APIs & Integrations

| Service                  | Purpose                                                          | Docs                                                    |
| ------------------------ | ---------------------------------------------------------------- | ------------------------------------------------------- |
| MongoDB Atlas            | Stores users, location pings, danger zones, and device tokens    | https://www.mongodb.com/docs/atlas                      |
| Firebase Cloud Messaging | Silent push to wake citizen apps when danger zones change        | https://firebase.google.com/docs/cloud-messaging        |
| Railway                  | Backend hosting and deployment                                   | https://docs.railway.app                                |
| Expo Location            | Background GPS tracking on the mobile app                        | https://docs.expo.dev/versions/latest/sdk/location      |
| Expo Notifications       | FCM push token registration and notification handling            | https://docs.expo.dev/versions/latest/sdk/notifications |
| Expo Task Manager        | Defines the background GPS task that runs when the app is closed | https://docs.expo.dev/versions/latest/sdk/task-manager  |

## Branches

| Branch              | Purpose                                                                                                                                                      | Status |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------ |
| `main`              | Repository root with shared documentation                                                                                                                    | active |
| `backend`           | Fastify REST API and WebSocket server - central data layer for the entire system                                                                             | active |
| `frontend`          | React web UI (three screens: safe / not safe / dispatch) designed to run embedded inside an Android WebView                                                  | active |
| `admin-panel`       | Rescue operator dashboard with a live Leaflet map, user status list, and danger zone drawing tool                                                            | active |
| `react-native-expo` | Cross-platform citizen mobile app built with Expo - background GPS, push notifications, and the full emergency status flow                                   | active |
| `nitatsu-frontend`  | Android-native implementation of the citizen app in Kotlin, loading the `frontend` build inside a WebView with a native foreground service and state machine | active |

---

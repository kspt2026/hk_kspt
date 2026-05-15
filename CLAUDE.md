# RescueGrid Mobile App

React Native Expo (managed workflow) citizen app for a disaster victim tracking system. Hackathon project, Android-first.

## What it does

When a disaster is declared:
1. Silent push from backend wakes the app.
2. App fetches updated zone polygons from `/zones`.
3. App locally checks whether the phone is inside a danger polygon (point-in-polygon, ray casting).
4. If inside, the app enters "danger mode" and starts uploading GPS to `/coords` every 15s or 10m.
5. A foreground watcher also detects zone entry while the app is open and switches the UI to the safety prompt screen.

All identification is anonymous — a single UUID `user_id` generated on first launch and persisted forever in `AsyncStorage`.

## Tech stack

- **Expo SDK 54** (managed workflow) — no Kotlin, no native modules
- **React Native 0.81**, **React 19**, **TypeScript**
- **NativeWind v4** (Tailwind for RN)
- **react-native-reanimated v4** + **react-native-worklets** (animations)
- **@expo/vector-icons** (MaterialCommunityIcons — replaces @iconify/react from old web version)
- **expo-location** (background GPS with Android foreground service)
- **expo-notifications** (FCM push token + silent push handling)
- **expo-task-manager** (background task definition)
- **@react-native-async-storage/async-storage** (persisted UUID)
- **uuid** + **react-native-get-random-values**

## Backend

Base URL: `https://hkkspt-production.up.railway.app`

| Endpoint | Method | Body | Notes |
|---|---|---|---|
| `/zones` | GET | — | Returns active zones with GeoJSON polygons. `coordinates: [[[lon,lat], ...]]` (lon first) |
| `/device-token` | POST | `{ user_id, token }` | Register FCM/Expo push token, call once on startup |
| `/coords` | POST | `{ user_id, lat, lon, ts }` | `ts` = `Date.now()` ms. Send only when inside a zone |

## Repo layout

```
index.js                 Entry. Registers locationTask + getRandomValues polyfill.
App.tsx                  Screen routing + startup sequence.
app.json                 Expo config: Android permissions, plugins, foreground service.
babel.config.js          nativewind preset + react-native-worklets plugin.
metro.config.js          withNativeWind wrapper.
tailwind.config.js       NativeWind preset + custom colors (bg, surface, border).
global.css               Tailwind directives.
src/
  constants.ts           API URL, LOCATION_TASK name, AsyncStorage keys.
  types.ts               Screen union, Zone type.
  api.ts                 fetchZones / registerToken / postCoords.
  storage.ts             getUserId (UUID, persisted).
  polygon.ts             pointInPolygon + isInsideAnyZone.
  locationTask.ts        TaskManager.defineTask. MUST stay module-level.
  permissions.ts         Notification + foreground/background location prompts.
  components/
    Button.tsx           Variants: primary, danger, ghost, danger-soft.
    Card.tsx             Card + CardHeader/CardContent/CardTitle/Chip.
    SettingsButton.tsx   Top-left cog → Linking.openSettings.
    FooterNote.tsx       Bottom hint text.
  screens/
    IdleScreen.tsx       Default. Pulsing shield, zone count, device id tail.
    InitialPrompt.tsx    "Are you safe?" — two big buttons.
    ConfirmedSafe.tsx    User said OK. Card with Cancel + Done.
    DispatchStatus.tsx   User said Not OK. Pulsing ambulance + "I'm safe".
```

## Screen flow

```
idle ── foreground watcher detects zone entry ──▶ initial
initial ── I'm OK ──▶ confirmed_safe
initial ── Not OK ──▶ dispatch_status
confirmed_safe ── Cancel ──▶ initial
confirmed_safe ── Done ──▶ idle
dispatch_status ── I'm safe ──▶ confirmed_safe
```

## Key rules — do not break

- `TaskManager.defineTask` must run at module top level. It lives in `src/locationTask.ts` and is imported at the top of `index.js` before `App` is registered.
- All background task code is wrapped in try/catch. An uncaught throw silently kills the task.
- `POST /coords` fires only when `isInsideAnyZone()` returns true.
- GeoJSON coordinate order is `[lon, lat]` — lon is index 0, lat is index 1. Easy to swap by accident.
- `ts` in `/coords` is milliseconds (`Date.now()`), not seconds.
- `user_id` is the only identity. Never store name, email, or phone.
- Zones must refresh on (a) app start, (b) silent push `zones_updated`, (c) AppState becoming `active`.
- If `Location.startLocationUpdatesAsync` throws "task already running", ignore it. Use `Location.hasStartedLocationUpdatesAsync` first.

## What to do next

### First-time setup

Requires Node 20+, Android Studio with SDK + platform-tools, and a connected Android device or running emulator.

```powershell
# Install dependencies
npm install

# Verify SDK 54 version pinning (auto-corrects any drift)
npx expo install --fix

# Generate the android/ folder from app.json
npx expo prebuild --platform android --clean
```

### Build and install on test device

```powershell
# Connect a device (see below), then:
npx expo run:android
```

First build: 5–15 minutes (Gradle downloads + native compile). Subsequent JS-only changes hot-reload via Metro — no rebuild needed.

### When to rebuild natively

Rerun `npx expo run:android` only if any of these change:

- A native dependency was added or removed
- `app.json` plugins, permissions, or scheme changed
- `babel.config.js` changed
- A `react-native-*` package was bumped to a new minor/major

For pure JS edits, just save the file. Metro reloads automatically.

### Full clean rebuild (when caches misbehave)

```powershell
Remove-Item -Recurse -Force node_modules, .expo, android, ios, package-lock.json -ErrorAction SilentlyContinue
npm install
npx expo install --fix
npx expo prebuild --platform android --clean
npx expo run:android
```

## How to upload to a test device

### Path A — Physical Android phone (fastest, recommended)

1. On the phone, Settings → About phone → tap "Build number" 7 times until Developer Options unlocks.
2. Settings → System → Developer options → enable **USB debugging**.
3. Connect phone over USB. On the phone, tap **Allow** in the "Allow USB debugging?" prompt (check trust).
4. Verify the device is visible:
   ```powershell
   adb devices
   ```
   Output should list a serial number (not empty).
5. Build and install:
   ```powershell
   npx expo run:android
   ```
   This compiles the APK, installs it on the phone, and starts the Metro bundler. The app launches automatically.

### Path B — Android emulator

1. Open Android Studio → More Actions → Virtual Device Manager (or Tools → Device Manager).
2. Click **+ Create Virtual Device**.
3. Pick a hardware profile (Pixel 7 or 8 is fine) → Next.
4. System image: choose **API 35 (Android 15)** or **API 34 (Android 14)**. Click the download icon (⬇) if it isn't installed. ~1.5 GB download.
5. Next → Finish.
6. Click ▶ to boot the emulator. Wait for the home screen to be fully visible.
7. Verify:
   ```powershell
   adb devices
   ```
   Should list `emulator-5554` (or similar).
8. Build and install:
   ```powershell
   npx expo run:android
   ```

### Path C — Sharing a build with others (no SDK on their machine)

Use EAS Build (Expo's cloud build service):

```powershell
npm install -g eas-cli
eas login
eas build --profile development --platform android
```

After 10–15 minutes, EAS returns a download URL. Open it on the target Android phone → download the APK → install (allow "Install from unknown sources" if prompted). The dev-client app supports hot reload from your Metro server too — just start `npx expo start --dev-client` and scan the QR.

Note: you'll need an `eas.json` (not present yet). EAS CLI offers to create one on first run.

## Environment requirements

- `ANDROID_HOME` set to `%LOCALAPPDATA%\Android\Sdk`
- `%ANDROID_HOME%\platform-tools` and `%ANDROID_HOME%\emulator` on `PATH`
- Verify: `adb --version` should print the ADB version

If `adb` is missing, the Android SDK Platform-Tools component is not installed. Open Android Studio → SDK Manager → SDK Tools tab → check "Android SDK Platform-Tools" + "Android Emulator" + "Android SDK Command-line Tools" → Apply.

## Why Expo (not WebView + Kotlin, not React Native bare)

Earlier this project had a Vite/React web frontend intended to run inside an Android WebView with a Kotlin native layer (FCM, location, foreground service, JS bridge). That was dropped in favor of pure Expo managed workflow on 2026-05-15 because:

- The 3 design screens port cleanly to React Native with NativeWind + Reanimated.
- Expo handles background location, push token registration, and the foreground service notification declaratively in `app.json`.
- One TypeScript codebase, cross-platform, no native bridge maintenance.
- Total estimated hackathon delivery time: ~4 hours vs. ~10 hours for the WebView + Kotlin route.

## Notes

- `expo-notifications` 0.32+ dropped Expo Go support for push tokens. The dev build covers that — token registration is wrapped in try/catch and is non-fatal in development.
- Background location does **not** work in Expo Go. The dev build is required for end-to-end testing of zone entry → coords upload.
- The IdleScreen is the only screen not present in the original Vite design. Added because the original lacked a default state when no danger zone was active.

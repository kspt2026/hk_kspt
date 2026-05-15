# RescueGrid Mobile App — Agent Build Prompt

You are building the **RescueGrid** React Native Expo citizen app from scratch. This is a hackathon project. Ship fast, no over-engineering.

---

## What you are building

A citizen phone app for disaster zone tracking. When a danger zone is declared:
1. A silent push notification wakes the app
2. App fetches updated zone polygons from the server
3. App checks locally whether the phone is inside a polygon (point-in-polygon)
4. If inside — phone enters **danger mode**: starts continuous background GPS and posts coordinates to server every 15s or 10m moved
5. Rescue team sees all active users on their dashboard via WebSocket

Everything works with screen locked.

---

## Tech stack

- React Native with **Expo managed workflow** (not bare, not Kotlin)
- TypeScript
- `expo-notifications` — FCM push token registration + silent push listener
- `expo-location` — background GPS with Android foreground service
- `expo-task-manager` — background task definition
- `@react-native-async-storage/async-storage` — persist user_id

Install command:
```
npx expo install expo-notifications expo-location expo-task-manager @react-native-async-storage/async-storage
```

**Platform priority:** Android first. iOS is secondary.

---

## Backend

**Base URL:** `https://hkkspt-production.up.railway.app`

### GET /zones
Returns active danger zones.
```json
[
  {
    "id": "uuid",
    "polygon": {
      "type": "Polygon",
      "coordinates": [[[lon, lat], [lon, lat], ...]]
    }
  }
]
```
GeoJSON order: **lon first, lat second** in coordinates array.

### POST /device-token
Register FCM token. Call once on startup.
```json
{ "user_id": "uuid", "token": "fcm-token-string" }
```
Response: `{ "ok": true }`

### POST /coords
Send GPS position. Call **only** when inside a danger zone.
```json
{ "user_id": "uuid", "lat": 50.45, "lon": 30.52, "ts": 1700000000000 }
```
`ts` is `Date.now()` — unix milliseconds.
Response: `{ "ok": true }`

---

## File structure to create

```
RescueGrid/
  app.json              ← Expo config: permissions, plugins
  package.json          ← dependencies
  App.tsx               ← startup sequence + notification listener + status UI
  src/
    constants.ts        ← API_URL, LOCATION_TASK name
    api.ts              ← fetchZones(), postCoords(), registerToken()
    storage.ts          ← getUserId() — UUID, generated once, stored forever
    polygon.ts          ← pointInPolygon(), isInsideAnyZone()
    locationTask.ts     ← TaskManager.defineTask() — module-level, imported at top of App.tsx
    permissions.ts      ← requestNotificationPermission(), requestLocationPermission()
```

---

## app.json config (required)

```json
{
  "expo": {
    "name": "RescueGrid",
    "slug": "rescuegrid",
    "version": "1.0.0",
    "ios": {
      "infoPlist": {
        "UIBackgroundModes": ["location", "fetch", "remote-notification"],
        "NSLocationAlwaysAndWhenInUseUsageDescription": "RescueGrid needs background location to detect danger zones and help rescuers find you.",
        "NSLocationWhenInUseUsageDescription": "RescueGrid needs location to detect danger zones."
      }
    },
    "android": {
      "package": "com.rescuegrid.app",
      "permissions": ["ACCESS_BACKGROUND_LOCATION", "ACCESS_FINE_LOCATION", "RECEIVE_BOOT_COMPLETED"]
    },
    "plugins": [
      ["expo-notifications", { "sounds": [] }],
      ["expo-location", { "isAndroidBackgroundLocationEnabled": true }]
    ]
  }
}
```

---

## constants.ts

```typescript
export const API = 'https://hkkspt-production.up.railway.app'
export const LOCATION_TASK = 'RESCUEGRID_LOCATION'
```

---

## storage.ts

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage'
import 'react-native-get-random-values'
import { v4 as uuidv4 } from 'uuid'

const KEY = 'user_id'

export async function getUserId(): Promise<string> {
  let id = await AsyncStorage.getItem(KEY)
  if (!id) {
    id = uuidv4()
    await AsyncStorage.setItem(KEY, id)
  }
  return id
}
```

Note: `react-native-get-random-values` must be imported before uuid. If uuid causes issues, use `Math.random().toString(36)` fallback for hackathon.

---

## api.ts

```typescript
import { API } from './constants'

export async function fetchZones() {
  const res = await fetch(`${API}/zones`)
  return res.json()
}

export async function registerToken(userId: string, token: string) {
  await fetch(`${API}/device-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId, token }),
  })
}

export async function postCoords(userId: string, lat: number, lon: number) {
  await fetch(`${API}/coords`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId, lat, lon, ts: Date.now() }),
  })
}
```

---

## polygon.ts

```typescript
// GeoJSON coordinates: [[lon, lat], ...] — lon is x (index 0), lat is y (index 1)
function pointInPolygon(lat: number, lon: number, coordinates: number[][]): boolean {
  let inside = false
  for (let i = 0, j = coordinates.length - 1; i < coordinates.length; j = i++) {
    const [xi, yi] = coordinates[i]
    const [xj, yj] = coordinates[j]
    const intersect = ((yi > lat) !== (yj > lat)) &&
      (lon < (xj - xi) * (lat - yi) / (yj - yi) + xi)
    if (intersect) inside = !inside
  }
  return inside
}

export function isInsideAnyZone(lat: number, lon: number, zones: any[]): boolean {
  return zones.some(z => pointInPolygon(lat, lon, z.polygon.coordinates[0]))
}
```

---

## locationTask.ts

**CRITICAL:** `TaskManager.defineTask` must be called at module top level, outside any component, before `AppRegistry`. Import this file at the very top of `App.tsx`.

```typescript
import * as TaskManager from 'expo-task-manager'
import * as Location from 'expo-location'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { LOCATION_TASK, API } from './constants'
import { isInsideAnyZone } from './polygon'

// Module-level — updated by App on fetch and on silent push
export let activeZones: any[] = []
export function setActiveZones(zones: any[]) {
  activeZones = zones
}

TaskManager.defineTask(LOCATION_TASK, async ({ data, error }: any) => {
  if (error || !data?.locations?.length) return
  try {
    const { latitude, longitude } = data.locations[0].coords
    const userId = await AsyncStorage.getItem('user_id')
    if (!userId) return
    if (!isInsideAnyZone(latitude, longitude, activeZones)) return
    await fetch(`${API}/coords`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, lat: latitude, lon: longitude, ts: Date.now() }),
    })
  } catch (_) {
    // never throw in background task — uncaught errors silently kill it
  }
})
```

---

## permissions.ts

```typescript
import * as Notifications from 'expo-notifications'
import * as Location from 'expo-location'

export async function requestNotificationPermission() {
  const { status } = await Notifications.requestPermissionsAsync()
  return status === 'granted'
}

export async function requestLocationPermission() {
  const fg = await Location.requestForegroundPermissionsAsync()
  if (fg.status !== 'granted') return false
  const bg = await Location.requestBackgroundPermissionsAsync()
  return bg.status === 'granted'
}
```

---

## App.tsx — startup sequence

```typescript
import './src/locationTask' // MUST be first import — registers background task
import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import * as Notifications from 'expo-notifications'
import * as Location from 'expo-location'
import { getUserId } from './src/storage'
import { fetchZones, registerToken } from './src/api'
import { setActiveZones, activeZones } from './src/locationTask'
import { requestNotificationPermission, requestLocationPermission } from './src/permissions'
import { LOCATION_TASK } from './src/constants'

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: false,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
})

export default function App() {
  const [status, setStatus] = useState('Initializing...')
  const [zoneCount, setZoneCount] = useState(0)
  const [tracking, setTracking] = useState(false)

  useEffect(() => {
    init()

    // Re-fetch zones when app comes to foreground
    const sub = Notifications.addNotificationReceivedListener(async (notification) => {
      if (notification.request.content.data?.type === 'zones_updated') {
        try {
          const zones = await fetchZones()
          setActiveZones(zones)
          setZoneCount(zones.length)
        } catch (_) {}
      }
    })

    return () => sub.remove()
  }, [])

  async function init() {
    try {
      // 1. User ID
      setStatus('Loading user ID...')
      const userId = await getUserId()

      // 2. Notification permission + FCM token
      setStatus('Requesting permissions...')
      await requestNotificationPermission()
      const tokenData = await Notifications.getExpoPushTokenAsync()
      await registerToken(userId, tokenData.data)

      // 3. Location permission
      const locGranted = await requestLocationPermission()
      if (!locGranted) {
        setStatus('Location permission denied. App cannot protect you.')
        return
      }

      // 4. Fetch zones
      setStatus('Fetching danger zones...')
      const zones = await fetchZones()
      setActiveZones(zones)
      setZoneCount(zones.length)

      // 5. Start background location task
      const isRunning = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK)
      if (!isRunning) {
        await Location.startLocationUpdatesAsync(LOCATION_TASK, {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 15000,
          distanceInterval: 10,
          foregroundService: {
            notificationTitle: 'RescueGrid',
            notificationBody: 'Monitoring for danger zones',
            notificationColor: '#FF3B30',
          },
          pausesUpdatesAutomatically: false,
          showsBackgroundLocationIndicator: true,
        })
      }

      setTracking(true)
      setStatus('Active — monitoring zones')
    } catch (e: any) {
      setStatus(`Error: ${e.message}`)
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>RescueGrid</Text>
      <Text style={styles.status}>{status}</Text>
      <Text style={styles.info}>Active zones: {zoneCount}</Text>
      <Text style={[styles.badge, tracking ? styles.safe : styles.warn]}>
        {tracking ? 'MONITORING' : 'OFFLINE'}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#111', padding: 24 },
  title: { fontSize: 32, fontWeight: 'bold', color: '#fff', marginBottom: 16 },
  status: { fontSize: 16, color: '#aaa', textAlign: 'center', marginBottom: 12 },
  info: { fontSize: 14, color: '#666', marginBottom: 24 },
  badge: { fontSize: 18, fontWeight: 'bold', paddingHorizontal: 20, paddingVertical: 8, borderRadius: 8 },
  safe: { backgroundColor: '#1a4d2e', color: '#4ade80' },
  warn: { backgroundColor: '#4d1a1a', color: '#f87171' },
})
```

---

## Startup sequence (order matters)

1. `getUserId()` — generate UUID on first launch, persist in AsyncStorage
2. Request notification permissions → get Expo push token → `POST /device-token`
3. `requestBackgroundPermissionsAsync()` — Android requires this after foreground
4. `GET /zones` → `setActiveZones(zones)`
5. `Location.startLocationUpdatesAsync(LOCATION_TASK, ...)` — start background task

---

## Key rules — do not break these

- `TaskManager.defineTask` must be at module top level, never inside a function or component
- `import './src/locationTask'` must be the **first import** in App.tsx
- Background task must have `try/catch` around everything — uncaught error kills the task silently
- `POST /coords` fires **only** when `isInsideAnyZone` returns `true`
- `user_id` is the only identity, never store name/email/phone
- `ts` in POST /coords is `Date.now()` (milliseconds, not seconds)
- GeoJSON coordinates are `[lon, lat]` — lon is index 0, lat is index 1
- If `startLocationUpdatesAsync` throws "task already started" — ignore it, check with `hasStartedLocationUpdatesAsync` first
- Refresh `activeZones` on silent push AND on app foreground resume

---

## Build order

1. Scaffold: `npx create-expo-app RescueGrid --template blank-typescript`
2. Install deps: `npx expo install expo-notifications expo-location expo-task-manager @react-native-async-storage/async-storage`
3. Write files in order: `constants.ts` → `api.ts` → `storage.ts` → `polygon.ts` → `locationTask.ts` → `permissions.ts` → `App.tsx`
4. Update `app.json` with permissions and plugins
5. Run: `npx expo start` (use Expo Go for quick test, dev build for background location)

---

## Testing notes

- Background location does NOT work in Expo Go — needs a development build (`npx expo run:android`)
- To test point-in-polygon: console.log coords and compare to zone boundaries from GET /zones
- Silent push in dev: use Expo push tool at https://expo.dev/notifications with `data: { type: "zones_updated" }`
- FCM setup: for production builds, `google-services.json` needed in root — get from Firebase Console

---

## What NOT to do

- Do not add maps (not needed for hackathon MVP)
- Do not add auth/login (user_id is anonymous UUID)
- Do not add a state machine (IDLE/SOS/etc.) — not needed, auto-track when in zone
- Do not use bare workflow or Kotlin
- Do not add error boundaries, retry logic, or offline caching beyond what's specified

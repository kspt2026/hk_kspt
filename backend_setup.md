You are building the React Native (Expo) mobile app for RescueGrid — a disaster victim tracking system. The backend is already built and running. Your job is the citizen phone app only.

## What this app does

When a danger zone is declared, phones inside that zone automatically send GPS coordinates to rescue services. The phone checks if it is inside a zone locally using point-in-polygon against zone polygons fetched from the server. Location is only actively tracked after the phone detects it is inside a declared zone.

## Tech stack

- React Native with Expo (managed workflow)
- expo-notifications (FCM push token + silent push handling)
- expo-location (background location)
- expo-task-manager (background task definitions)

Install:
  expo install expo-notifications expo-location expo-task-manager

## Backend base URL

const API = 'http://localhost:3000'  // replace with deployed URL for production

## Backend endpoints

### GET /zones
Returns active danger zones with GeoJSON polygons.
Response:
[
  {
    "id": "uuid",
    "polygon": {
      "type": "Polygon",
      "coordinates": [[[lon, lat], [lon, lat], ...]]  // GeoJSON — lon first, lat second
    }
  }
]
Fetch on app start and on every silent push. Store result in memory.

### POST /device-token
Register FCM push token. Call once on app start after getting token.
Body: { "user_id": "uuid", "token": "fcm-token-string" }
Response: { "ok": true }

### POST /coords
Send current GPS position. Call only when inside a danger zone.
Body: { "user_id": "uuid", "lat": 50.45, "lon": 30.52, "ts": 1700000000000 }
ts is Date.now() — unix milliseconds.
Response: { "ok": true }

## Required app.json config

{
  "expo": {
    "ios": {
      "infoPlist": {
        "UIBackgroundModes": ["location", "fetch", "remote-notification"],
        "NSLocationAlwaysAndWhenInUseUsageDescription": "RescueGrid needs background location to detect danger zones and help rescuers find you.",
        "NSLocationWhenInUseUsageDescription": "RescueGrid needs location to detect danger zones."
      }
    },
    "android": {
      "permissions": ["ACCESS_BACKGROUND_LOCATION", "ACCESS_FINE_LOCATION", "RECEIVE_BOOT_COMPLETED"]
    },
    "plugins": [
      ["expo-notifications", { "sounds": [] }],
      ["expo-location", { "isAndroidBackgroundLocationEnabled": true }]
    ]
  }
}

## App startup sequence

1. Generate or load user_id from AsyncStorage (crypto.randomUUID() on first launch, persist forever)
2. Request notification permissions → get FCM token via expo-notifications → POST /device-token
3. Request location permission: Location.requestBackgroundPermissionsAsync()
4. GET /zones → store polygon list in memory
5. Start background location task

## Point-in-polygon check

Use ray-casting to check if current position is inside any fetched zone polygon.

function pointInPolygon(lat, lon, coordinates) {
  // coordinates: [[lon, lat], ...] — GeoJSON order
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

function isInsideAnyZone(lat, lon, zones) {
  return zones.some(z => pointInPolygon(lat, lon, z.polygon.coordinates[0]))
}

## Background location task

Define at module top level (outside any component).

import * as TaskManager from 'expo-task-manager'
import * as Location from 'expo-location'
import AsyncStorage from '@react-native-async-storage/async-storage'

const LOCATION_TASK = 'RESCUEGRID_LOCATION'

// zones is held in a module-level variable, updated on fetch and on silent push
let activeZones = []

TaskManager.defineTask(LOCATION_TASK, async ({ data: { locations }, error }) => {
  if (error || !locations?.length) return
  try {
    const { latitude, longitude } = locations[0].coords
    const userId = await AsyncStorage.getItem('user_id')

    if (!isInsideAnyZone(latitude, longitude, activeZones)) return

    await fetch(`${API}/coords`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, lat: latitude, lon: longitude, ts: Date.now() })
    })
  } catch (_) {}  // never throw in background task
})

## Start location updates

Call after permissions granted:

await Location.startLocationUpdatesAsync(LOCATION_TASK, {
  accuracy: Location.Accuracy.Balanced,
  timeInterval: 15000,         // check every 15s
  distanceInterval: 10,        // or every 10 meters moved
  foregroundService: {         // Android: keeps task alive
    notificationTitle: 'RescueGrid',
    notificationBody: 'Monitoring for danger zones',
  },
  pausesUpdatesAutomatically: false,
  showsBackgroundLocationIndicator: true,  // iOS: blue bar
})

## Silent push handling (zone list updated by admin)

When admin creates or deletes a zone, backend sends a silent push with data.type === "zones_updated".
App wakes, re-fetches zones, updates activeZones in memory.

import * as Notifications from 'expo-notifications'

Notifications.addNotificationReceivedListener(async (notification) => {
  if (notification.request.content.data?.type === 'zones_updated') {
    try {
      const res = await fetch(`${API}/zones`)
      activeZones = await res.json()
    } catch (_) {}
  }
})

## Key rules

- user_id: UUID, generated once on first launch, stored in AsyncStorage, never changes
- Never store PII — user_id is the only identity
- POST /coords fires only when pointInPolygon returns true
- All background task code must be wrapped in try/catch — uncaught errors silently kill the task
- activeZones must be refreshed on app foreground resume too (not only on silent push)
- If Location.startLocationUpdatesAsync throws "task already running", it's safe to ignore

import * as TaskManager from 'expo-task-manager'
import * as Notifications from 'expo-notifications'
import AsyncStorage from '@react-native-async-storage/async-storage'
import {
  LOCATION_TASK,
  API,
  USER_ID_KEY,
  IS_SAFE_KEY,
  ZONES_CACHE_KEY,
  LAST_NOTIFIED_KEY,
} from './constants'
import { isInsideAnyZone } from './polygon'
import type { Zone } from './types'

let activeZones: Zone[] = []

export function setActiveZones(zones: Zone[]) {
  activeZones = zones
  AsyncStorage.setItem(ZONES_CACHE_KEY, JSON.stringify(zones)).catch(() => {})
}

export function getActiveZones(): Zone[] {
  return activeZones
}

async function resolveZones(): Promise<Zone[]> {
  try {
    const cached = await AsyncStorage.getItem(ZONES_CACHE_KEY)
    if (cached) {
      const zones = JSON.parse(cached) as Zone[]
      activeZones = zones
      return zones
    }
  } catch {}
  return activeZones
}

const NOTIFY_COOLDOWN_MS = 5 * 60 * 1000

type LocationTaskData = {
  locations?: Array<{
    coords: { latitude: number; longitude: number; altitude: number | null }
  }>
}

TaskManager.defineTask(LOCATION_TASK, async ({ data, error }) => {
  if (error || !data) return
  try {
    const { locations } = data as LocationTaskData
    if (!locations?.length) return
    const { latitude, longitude, altitude } = locations[0].coords

    const zones = await resolveZones()
    if (!isInsideAnyZone(latitude, longitude, zones)) return

    const isSafe = await AsyncStorage.getItem(IS_SAFE_KEY)
    if (isSafe === '1') return

    const userId = await AsyncStorage.getItem(USER_ID_KEY)
    if (!userId) return

    await fetch(`${API}/coords`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: userId,
        lat: latitude,
        lon: longitude,
        alt: altitude ?? 0,
        ts: Date.now(),
      }),
    })

    // throttled local notification so lock screen shows action buttons
    const lastTs = await AsyncStorage.getItem(LAST_NOTIFIED_KEY)
    const now = Date.now()
    if (lastTs && now - parseInt(lastTs, 10) < NOTIFY_COOLDOWN_MS) return

    await AsyncStorage.setItem(LAST_NOTIFIED_KEY, String(now))
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '⚠️ You are in a Danger Zone',
        body: 'Tap to confirm your status or mark yourself safe.',
        categoryIdentifier: 'DANGER_ZONE',
        data: { type: 'zone_entry' },
        priority: Notifications.AndroidNotificationPriority.MAX,
      },
      trigger: null,
    })
  } catch {
    // never throw in background task
  }
})

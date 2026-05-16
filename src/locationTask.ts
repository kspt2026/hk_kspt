import * as TaskManager from 'expo-task-manager'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { LOCATION_TASK, API, USER_ID_KEY, IS_SAFE_KEY } from './constants'
import { isInsideAnyZone } from './polygon'
import type { Zone } from './types'

let activeZones: Zone[] = []

export function setActiveZones(zones: Zone[]) {
  activeZones = zones
}

export function getActiveZones(): Zone[] {
  return activeZones
}

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
    if (!isInsideAnyZone(latitude, longitude, activeZones)) return

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
  } catch {
    // never throw in background task
  }
})

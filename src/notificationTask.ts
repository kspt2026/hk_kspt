import * as TaskManager from 'expo-task-manager'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { NOTIFICATION_TASK, API, ZONES_CACHE_KEY } from './constants'
import { setActiveZones } from './locationTask'

TaskManager.defineTask(NOTIFICATION_TASK, async ({ data, error }) => {
  if (error || !data) return
  try {
    const notification = (data as any).notification
    const type = notification?.request?.content?.data?.type
    if (type !== 'zones_updated') return
    const res = await fetch(`${API}/zones`)
    if (res.ok) {
      const zones = await res.json()
      await AsyncStorage.setItem(ZONES_CACHE_KEY, JSON.stringify(zones))
      setActiveZones(zones)
    }
  } catch {}
})

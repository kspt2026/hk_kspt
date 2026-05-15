import * as Notifications from 'expo-notifications'
import * as Location from 'expo-location'

export async function requestNotificationPermission(): Promise<boolean> {
  const { status } = await Notifications.requestPermissionsAsync()
  return status === 'granted'
}

export async function requestLocationPermission(): Promise<boolean> {
  const fg = await Location.requestForegroundPermissionsAsync()
  if (fg.status !== 'granted') return false
  const bg = await Location.requestBackgroundPermissionsAsync()
  return bg.status === 'granted'
}

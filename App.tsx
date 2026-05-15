import './global.css'
import React, { useEffect, useRef, useState } from 'react'
import { View, AppState, type AppStateStatus } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import * as Notifications from 'expo-notifications'
import * as Location from 'expo-location'
import * as Device from 'expo-device'
import Constants from 'expo-constants'
import { LOCATION_TASK } from './src/constants'
import { getUserId } from './src/storage'
import { fetchZones, registerToken } from './src/api'
import { setActiveZones } from './src/locationTask'
import { isInsideAnyZone } from './src/polygon'
import { requestLocationPermission, requestNotificationPermission } from './src/permissions'
import type { Screen, Zone } from './src/types'
import { IdleScreen } from './src/screens/IdleScreen'
import { InitialPrompt } from './src/screens/InitialPrompt'
import { ConfirmedSafe } from './src/screens/ConfirmedSafe'
import { DispatchStatus } from './src/screens/DispatchStatus'

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: false,
    shouldShowList: false,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
})

export default function App() {
  const [screen, setScreen] = useState<Screen>('idle')
  const [zones, setZones] = useState<Zone[]>([])
  const [userId, setUserId] = useState<string>('')
  const [status, setStatus] = useState('Initializing…')
  const watcherRef = useRef<Location.LocationSubscription | null>(null)
  const screenRef = useRef<Screen>('idle')

  useEffect(() => {
    screenRef.current = screen
  }, [screen])

  useEffect(() => {
    let mounted = true
    let pushSub: ReturnType<typeof Notifications.addNotificationReceivedListener> | null = null
    let appStateSub: ReturnType<typeof AppState.addEventListener> | null = null

    ;(async () => {
      try {
        const uid = await getUserId()
        if (!mounted) return
        setUserId(uid)

        setStatus('Requesting permissions…')
        await requestNotificationPermission()

        try {
          if (Device.isDevice) {
            const projectId =
              Constants.expoConfig?.extra?.eas?.projectId ??
              Constants.easConfig?.projectId
            const tokenData = projectId
              ? await Notifications.getExpoPushTokenAsync({ projectId })
              : await Notifications.getDevicePushTokenAsync()
            await registerToken(uid, tokenData.data)
          }
        } catch {
          // skip token registration in dev / simulator
        }

        const locGranted = await requestLocationPermission()
        if (!locGranted) {
          setStatus('Location permission required.')
          return
        }

        setStatus('Fetching zones…')
        const z = await fetchZones().catch(() => [] as Zone[])
        if (!mounted) return
        setActiveZones(z)
        setZones(z)

        const isRunning = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK)
        if (!isRunning) {
          await Location.startLocationUpdatesAsync(LOCATION_TASK, {
            accuracy: Location.Accuracy.Balanced,
            timeInterval: 15000,
            distanceInterval: 10,
            foregroundService: {
              notificationTitle: 'RescueGrid',
              notificationBody: 'Monitoring for danger zones',
              notificationColor: '#0a0a0f',
            },
            pausesUpdatesAutomatically: false,
            showsBackgroundLocationIndicator: true,
          }).catch(() => {})
        }

        watcherRef.current = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.Balanced, timeInterval: 10000, distanceInterval: 10 },
          (loc) => {
            const inside = isInsideAnyZone(loc.coords.latitude, loc.coords.longitude, z)
            if (inside && screenRef.current === 'idle') {
              setScreen('initial')
            }
          }
        )

        setStatus('Monitoring for danger zones')
      } catch (e: any) {
        setStatus(`Error: ${e?.message ?? 'init failed'}`)
      }
    })()

    pushSub = Notifications.addNotificationReceivedListener(async (notification) => {
      const data = notification.request.content.data as { type?: string } | undefined
      if (data?.type === 'zones_updated') {
        try {
          const z = await fetchZones()
          if (!mounted) return
          setActiveZones(z)
          setZones(z)
        } catch {}
      }
    })

    appStateSub = AppState.addEventListener('change', async (s: AppStateStatus) => {
      if (s === 'active') {
        try {
          const z = await fetchZones()
          if (!mounted) return
          setActiveZones(z)
          setZones(z)
        } catch {}
      }
    })

    return () => {
      mounted = false
      pushSub?.remove()
      appStateSub?.remove()
      watcherRef.current?.remove()
    }
  }, [])

  const userIdShort = userId ? userId.slice(-4) : '????'

  return (
    <SafeAreaProvider>
      <View className="flex-1 bg-bg">
        <StatusBar style="light" />
        {screen === 'idle' && (
          <IdleScreen zoneCount={zones.length} userIdShort={userIdShort} status={status} />
        )}
        {screen === 'initial' && <InitialPrompt onTransition={setScreen} />}
        {screen === 'confirmed_safe' && <ConfirmedSafe onTransition={setScreen} />}
        {screen === 'dispatch_status' && <DispatchStatus onTransition={setScreen} />}
      </View>
    </SafeAreaProvider>
  )
}

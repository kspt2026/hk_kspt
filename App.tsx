import './global.css'
import React, { useEffect, useRef, useState } from 'react'
import { View, AppState, type AppStateStatus } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import * as Notifications from 'expo-notifications'
import * as Location from 'expo-location'
import * as Device from 'expo-device'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { LOCATION_TASK, NOTIFICATION_TASK, IS_SAFE_KEY, USER_ID_KEY } from './src/constants'
import { getUserId } from './src/storage'
import { fetchZones, registerToken, postUserIsSafe } from './src/api'
import { setActiveZones } from './src/locationTask'
import './src/notificationTask'
import { isInsideAnyZone } from './src/polygon'
import { requestLocationPermission, requestNotificationPermission } from './src/permissions'
import type { Screen, Zone } from './src/types'
import { IdleScreen } from './src/screens/IdleScreen'
import { InitialPrompt } from './src/screens/InitialPrompt'
import { ConfirmedSafe } from './src/screens/ConfirmedSafe'
import { DispatchStatus } from './src/screens/DispatchStatus'
import { MapButton } from './src/components/MapButton'
import { MapOverlay } from './src/components/MapOverlay'

Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const data = notification.request.content.data as { type?: string } | undefined
    const isLocalAlert = data?.type === 'zone_entry'
    return {
      shouldShowBanner: isLocalAlert,
      shouldShowList: isLocalAlert,
      shouldPlaySound: isLocalAlert,
      shouldSetBadge: false,
    }
  },
})

export default function App() {
  const [screen, setScreen] = useState<Screen>('idle')
  const [zones, setZones] = useState<Zone[]>([])
  const [userId, setUserId] = useState<string>('')
  const [status, setStatus] = useState('Initializing…')
  const [mapOpen, setMapOpen] = useState(false)
  const [userLocation, setUserLocation] = useState<{ lat: number; lon: number } | null>(null)
  const [insideZone, setInsideZone] = useState(false)
  const watcherRef = useRef<Location.LocationSubscription | null>(null)
  const screenRef = useRef<Screen>('idle')
  const userIdRef = useRef<string>('')

  useEffect(() => {
    userIdRef.current = userId
  }, [userId])

  function transition(next: Screen) {
    if (next === 'confirmed_safe' && userIdRef.current) {
      AsyncStorage.setItem(IS_SAFE_KEY, '1').catch(() => {})
      postUserIsSafe(userIdRef.current).catch(() => {})
    } else if (next === 'initial') {
      AsyncStorage.removeItem(IS_SAFE_KEY).catch(() => {})
    }
    setScreen(next)
  }

  useEffect(() => {
    screenRef.current = screen
  }, [screen])

  useEffect(() => {
    let mounted = true
    let pushSub: ReturnType<typeof Notifications.addNotificationReceivedListener> | null = null
    let responseSub: ReturnType<typeof Notifications.addNotificationResponseReceivedListener> | null = null
    let appStateSub: ReturnType<typeof AppState.addEventListener> | null = null

    ;(async () => {
      try {
        const uid = await getUserId()
        if (!mounted) return
        setUserId(uid)

        setStatus('Requesting permissions…')
        await requestNotificationPermission()

        await Notifications.setNotificationCategoryAsync('DANGER_ZONE', [
          { identifier: 'SAFE', buttonTitle: "I'm Safe", options: { opensAppToForeground: true } },
        ])

        try {
          await Notifications.registerTaskAsync(NOTIFICATION_TASK)
        } catch {}

        try {
          if (Device.isDevice) {
            const tokenData = await Notifications.getDevicePushTokenAsync()
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
              notificationTitle: 'backtrace',
              notificationBody: 'Monitoring for danger zones',
              notificationColor: '#0a0a0f',
            },
            pausesUpdatesAutomatically: false,
            showsBackgroundLocationIndicator: true,
          }).catch(() => {})
        }

        watcherRef.current = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.Balanced, timeInterval: 10000, distanceInterval: 10 },
          async (loc) => {
            setUserLocation({ lat: loc.coords.latitude, lon: loc.coords.longitude })
            const inside = isInsideAnyZone(loc.coords.latitude, loc.coords.longitude, z)
            setInsideZone(inside)
            if (!inside || screenRef.current !== 'idle') return
            const safe = await AsyncStorage.getItem(IS_SAFE_KEY)
            if (safe === '1') return
            setScreen('initial')
          }
        )

        setStatus('Monitoring for danger zones')

        // handle notification that launched the app
        const lastResponse = await Notifications.getLastNotificationResponseAsync()
        if (lastResponse && mounted) {
          const data = lastResponse.notification.request.content.data as { type?: string }
          if (data?.type === 'zone_entry') {
            if (lastResponse.actionIdentifier === 'SAFE') {
              await AsyncStorage.setItem(IS_SAFE_KEY, '1')
              const uid2 = await AsyncStorage.getItem(USER_ID_KEY)
              if (uid2) postUserIsSafe(uid2).catch(() => {})
              if (mounted) setScreen('confirmed_safe')
            } else {
              if (mounted) setScreen('initial')
            }
          }
        }
      } catch (e: any) {
        setStatus(`Error: ${e?.message ?? 'init failed'}`)
      }
    })()

    pushSub = Notifications.addNotificationReceivedListener(async (notification) => {
      const data = notification.request.content.data as { type?: string } | undefined
      if (data?.type === 'zones_updated') {
        try {
          await AsyncStorage.removeItem(IS_SAFE_KEY)
          const z = await fetchZones()
          if (!mounted) return
          setActiveZones(z)
          setZones(z)
        } catch {}
      }
    })

    responseSub = Notifications.addNotificationResponseReceivedListener(async (response) => {
      const data = response.notification.request.content.data as { type?: string }
      if (data?.type !== 'zone_entry') return
      if (response.actionIdentifier === 'SAFE') {
        await AsyncStorage.setItem(IS_SAFE_KEY, '1')
        const uid = await AsyncStorage.getItem(USER_ID_KEY)
        if (uid) postUserIsSafe(uid).catch(() => {})
        if (mounted) setScreen('confirmed_safe')
      } else {
        if (mounted) setScreen('initial')
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
      responseSub?.remove()
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
          <IdleScreen
            zoneCount={zones.length}
            userIdShort={userIdShort}
            status={status}
            insideZone={insideZone}
            onTransition={transition}
          />
        )}
        {screen === 'initial' && <InitialPrompt onTransition={transition} />}
        {screen === 'confirmed_safe' && <ConfirmedSafe onTransition={transition} />}
        {screen === 'dispatch_status' && <DispatchStatus onTransition={transition} />}

        <MapButton zoneCount={zones.length} onPress={() => setMapOpen(true)} />
        <MapOverlay visible={mapOpen} zones={zones} onClose={() => setMapOpen(false)} userLocation={userLocation} />
      </View>
    </SafeAreaProvider>
  )
}

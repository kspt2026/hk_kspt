import React, { useEffect } from 'react'
import { View, Text } from 'react-native'
import Animated, {
  FadeIn,
  FadeOut,
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { SettingsButton } from '../components/SettingsButton'

interface Props {
  zoneCount: number
  userIdShort: string
  status: string
}

export function IdleScreen({ zoneCount, userIdShort, status }: Props) {
  const pulse = useSharedValue(0)

  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
      -1,
      false
    )
  }, [])

  const ringStyle = useAnimatedStyle(() => ({
    opacity: 1 - pulse.value,
    transform: [{ scale: 1 + pulse.value * 1.6 }],
  }))

  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(200)}
      className="relative flex-1 bg-bg items-center justify-center"
    >
      <SettingsButton />

      <View className="items-center gap-6 px-6">
        <View className="w-32 h-32 items-center justify-center">
          <Animated.View
            style={ringStyle}
            className="absolute w-32 h-32 rounded-full border-2 border-green-400"
          />
          <View className="w-24 h-24 rounded-full bg-green-500/15 border border-green-500/30 items-center justify-center">
            <MaterialCommunityIcons name="shield-check" size={48} color="#4ade80" />
          </View>
        </View>

        <Animated.View entering={FadeInDown.duration(280).delay(80)} className="items-center gap-2">
          <Text className="text-2xl font-bold text-white text-center">RescueGrid</Text>
          <Text className="text-base text-neutral-400 text-center">{status}</Text>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.duration(280).delay(180)}
          className="flex-row gap-3 mt-4"
        >
          <View className="bg-surface border border-border rounded-xl px-4 py-3 items-center">
            <Text className="text-2xl font-bold text-white">{zoneCount}</Text>
            <Text className="text-xs text-neutral-500 mt-1">active zones</Text>
          </View>
          <View className="bg-surface border border-border rounded-xl px-4 py-3 items-center">
            <Text className="text-2xl font-bold text-white">···{userIdShort}</Text>
            <Text className="text-xs text-neutral-500 mt-1">device id</Text>
          </View>
        </Animated.View>
      </View>

      <View className="absolute bottom-8 left-0 right-0 px-6">
        <Text className="text-center text-xs text-neutral-500">
          Location stays on device until a danger zone is declared.
        </Text>
      </View>
    </Animated.View>
  )
}

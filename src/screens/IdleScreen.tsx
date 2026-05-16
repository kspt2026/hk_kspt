import React from 'react'
import { View, Text, Pressable } from 'react-native'
import Animated, { FadeIn, FadeOut, FadeInDown } from 'react-native-reanimated'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { SettingsButton } from '../components/SettingsButton'
import type { Screen } from '../types'

interface Props {
  zoneCount: number
  userIdShort: string
  status: string
  insideZone: boolean
  onTransition: (screen: Screen) => void
}

export function IdleScreen({ zoneCount, userIdShort, status, insideZone, onTransition }: Props) {
  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(200)}
      className="relative flex-1 bg-bg items-center justify-center"
    >
      <SettingsButton />

      <View className="items-center gap-6 px-6">
        <Animated.View entering={FadeInDown.duration(280).delay(0)} className="items-center gap-2">
          <Text
            className="text-white font-black"
            style={{ fontSize: 56, letterSpacing: -2, lineHeight: 60 }}
          >
            backtrace
          </Text>
          <View className="flex-row items-center gap-2">
            <View className="w-1.5 h-1.5 rounded-full bg-green-400" />
            <Text className="text-sm text-neutral-400">{status}</Text>
          </View>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.duration(280).delay(120)}
          className="flex-row gap-3 mt-2"
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

      <View className="absolute bottom-8 left-0 right-0 px-6 gap-3">
        {insideZone && (
          <Pressable
            onPress={() => onTransition('initial')}
            accessibilityLabel="Report your status"
            className="bg-red-950/80 border border-red-800/60 rounded-2xl px-4 py-3.5 flex-row items-center gap-3 active:bg-red-900/60"
          >
            <View className="w-8 h-8 rounded-full bg-red-600/20 items-center justify-center">
              <MaterialCommunityIcons name="alert" size={18} color="#ef4444" />
            </View>
            <View className="flex-1">
              <Text className="text-red-400 text-sm font-semibold">You are in a danger zone</Text>
              <Text className="text-neutral-500 text-xs mt-0.5">Tap to report your status</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={20} color="#ef4444" />
          </Pressable>
        )}
        <Text className="text-center text-xs text-neutral-500">
          Location stays on device until a danger zone is declared.
        </Text>
      </View>
    </Animated.View>
  )
}

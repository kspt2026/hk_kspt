import React from 'react'
import { View, Text } from 'react-native'
import Animated, { FadeIn, FadeOut, FadeInDown } from 'react-native-reanimated'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { Button } from '../components/Button'
import { SettingsButton } from '../components/SettingsButton'
import { FooterNote } from '../components/FooterNote'
import type { Screen } from '../types'

interface Props {
  onTransition: (screen: Screen) => void
}

const EASE = [0.25, 0.46, 0.45, 0.94] as const

export function InitialPrompt({ onTransition }: Props) {
  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(200)}
      className="relative flex-1 bg-bg items-center justify-center"
    >
      <SettingsButton />

      <View className="items-center gap-3 px-6">
        <Animated.Text
          entering={FadeInDown.duration(280).delay(0)}
          className="text-2xl font-bold text-white text-center leading-tight"
        >
          Building rumble in your area!
        </Animated.Text>

        <Animated.Text
          entering={FadeInDown.duration(280).delay(100)}
          className="text-lg text-neutral-400 text-center"
        >
          Are you safe?
        </Animated.Text>

        <Animated.View
          entering={FadeInDown.duration(280).delay(200)}
          className="flex-row gap-4 mt-6"
        >
          <Button
            variant="primary"
            size="lg"
            square
            accessibilityLabel="I am safe"
            className="w-40 h-40"
            onPress={() => onTransition('confirmed_safe')}
          >
            <MaterialCommunityIcons name="hand-wave" size={40} color="#fff" />
            <Text className="text-white font-semibold text-base">I'm OK</Text>
          </Button>

          <Button
            variant="danger"
            size="lg"
            square
            accessibilityLabel="I am not safe"
            className="w-40 h-40"
            onPress={() => onTransition('dispatch_status')}
          >
            <MaterialCommunityIcons name="close-thick" size={40} color="#fff" />
            <Text className="text-white font-semibold text-base">Not OK</Text>
          </Button>
        </Animated.View>
      </View>

      <FooterNote />
    </Animated.View>
  )
}

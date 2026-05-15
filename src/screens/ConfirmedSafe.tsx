import React from 'react'
import { View, Text } from 'react-native'
import Animated, { FadeIn, FadeOut, ZoomIn, ZoomOut } from 'react-native-reanimated'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { Button } from '../components/Button'
import { Card, CardContent, Chip } from '../components/Card'
import { SettingsButton } from '../components/SettingsButton'
import { FooterNote } from '../components/FooterNote'
import type { Screen } from '../types'

interface Props {
  onTransition: (screen: Screen) => void
}

export function ConfirmedSafe({ onTransition }: Props) {
  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(200)}
      className="relative flex-1 bg-bg items-center justify-center"
    >
      <SettingsButton />

      <View className="absolute inset-0 items-center justify-center" pointerEvents="none">
        <View className="absolute w-72 h-24 rounded-full bg-red-600/20" />
        <Text className="text-2xl font-bold text-white text-center px-6 opacity-20">
          Building rumble in your area!
        </Text>
        <Text className="text-lg text-neutral-400 text-center opacity-20 mt-2">
          Are you safe?
        </Text>
      </View>

      <Animated.View
        entering={ZoomIn.springify().damping(25).stiffness(300)}
        exiting={ZoomOut.duration(180)}
        className="w-full max-w-sm px-4"
      >
        <Card>
          <CardContent className="gap-4">
            <View className="flex-row items-center gap-3">
              <Chip color="success">
                <View className="flex-row items-center gap-1">
                  <MaterialCommunityIcons name="check-circle" size={14} color="#86efac" />
                  <Text className="text-green-300 text-xs font-medium">Safe</Text>
                </View>
              </Chip>
              <Text className="text-white font-medium text-sm flex-1">
                You've reported yourself safe.
              </Text>
            </View>

            <View className="gap-3 mt-2">
              <Button
                variant="danger-soft"
                size="lg"
                fullWidth
                onPress={() => onTransition('initial')}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="lg"
                fullWidth
                onPress={() => onTransition('idle')}
              >
                Done
              </Button>
            </View>
          </CardContent>
        </Card>
      </Animated.View>

      <FooterNote />
    </Animated.View>
  )
}

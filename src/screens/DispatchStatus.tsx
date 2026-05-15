import React, { useEffect } from 'react'
import { View, Text } from 'react-native'
import Animated, {
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { Button } from '../components/Button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/Card'
import { SettingsButton } from '../components/SettingsButton'
import { FooterNote } from '../components/FooterNote'
import type { Screen } from '../types'

interface Props {
  onTransition: (screen: Screen) => void
}

export function DispatchStatus({ onTransition }: Props) {
  const scale = useSharedValue(1)

  useEffect(() => {
    scale.value = withRepeat(
      withTiming(1.05, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    )
  }, [])

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }))

  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(200)}
      className="relative flex-1 bg-bg items-center justify-center"
    >
      <SettingsButton />

      <Animated.View
        entering={SlideInDown.springify().damping(26).stiffness(280)}
        exiting={SlideOutDown.duration(180)}
        className="w-full max-w-sm px-4"
      >
        <Card>
          <CardHeader>
            <CardTitle>The rescue team is on their way!</CardTitle>
          </CardHeader>

          <CardContent className="items-center gap-6">
            <View className="relative items-center justify-center">
              <Animated.View style={pulseStyle}>
                <MaterialCommunityIcons name="ambulance" size={96} color="#ef4444" />
              </Animated.View>
              <View className="absolute bottom-0 right-0 bg-bg rounded-full p-0.5">
                <MaterialCommunityIcons name="check-circle" size={28} color="#22c55e" />
              </View>
            </View>

            <Button
              variant="danger"
              size="lg"
              fullWidth
              onPress={() => onTransition('confirmed_safe')}
            >
              I'm safe
            </Button>
          </CardContent>
        </Card>
      </Animated.View>

      <FooterNote />
    </Animated.View>
  )
}

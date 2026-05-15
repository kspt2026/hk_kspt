import React from 'react'
import { Pressable, Linking } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'

export function SettingsButton() {
  return (
    <Pressable
      accessibilityLabel="Settings"
      onPress={() => Linking.openSettings()}
      className="absolute top-12 left-4 z-10 w-12 h-12 rounded-full bg-white/5 active:bg-white/10 items-center justify-center"
    >
      <MaterialCommunityIcons name="cog" size={24} color="#fff" />
    </Pressable>
  )
}

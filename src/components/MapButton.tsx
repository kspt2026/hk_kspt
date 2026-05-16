import React from 'react'
import { Pressable, View, Text } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'

interface Props {
  zoneCount: number
  onPress: () => void
}

export function MapButton({ zoneCount, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel="Open danger zones map"
      className="absolute top-12 right-4 z-40 w-12 h-12 rounded-full bg-white/5 active:bg-white/10 items-center justify-center"
    >
      <MaterialCommunityIcons name="map" size={24} color="#fff" />
      {zoneCount > 0 && (
        <View className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-red-600 items-center justify-center">
          <Text className="text-white text-[10px] font-bold">{zoneCount}</Text>
        </View>
      )}
    </Pressable>
  )
}

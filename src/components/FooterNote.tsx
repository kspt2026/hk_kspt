import React from 'react'
import { Text, View } from 'react-native'

export function FooterNote({ text = 'This will send your location to the rescue services.' }: { text?: string }) {
  return (
    <View className="absolute bottom-8 left-0 right-0 px-6">
      <Text className="text-center text-xs text-neutral-500">{text}</Text>
    </View>
  )
}

import React from 'react'
import { View, Text } from 'react-native'

export function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <View className={`bg-surface border border-border rounded-2xl overflow-hidden ${className}`}>
      {children}
    </View>
  )
}

export function CardHeader({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <View className={`px-6 pt-6 pb-0 ${className}`}>{children}</View>
}

export function CardContent({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <View className={`p-6 ${className}`}>{children}</View>
}

export function CardTitle({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <Text className={`text-xl font-bold text-white text-center ${className}`}>
      {children}
    </Text>
  )
}

export function Chip({
  children,
  color = 'success',
  className = '',
}: {
  children: React.ReactNode
  color?: 'success' | 'danger' | 'neutral'
  className?: string
}) {
  const bg =
    color === 'success'
      ? 'bg-green-500/15 border-green-500/30'
      : color === 'danger'
      ? 'bg-red-500/15 border-red-500/30'
      : 'bg-white/10 border-white/20'
  const text =
    color === 'success' ? 'text-green-300' : color === 'danger' ? 'text-red-300' : 'text-white'
  return (
    <View className={`flex-row items-center gap-1 px-2 py-1 rounded-full border ${bg} ${className}`}>
      {typeof children === 'string' ? (
        <Text className={`text-xs font-medium ${text}`}>{children}</Text>
      ) : (
        children
      )}
    </View>
  )
}

import React from 'react'
import { Pressable, Text, View, type PressableProps, type ViewStyle, type StyleProp } from 'react-native'

type Variant = 'primary' | 'danger' | 'ghost' | 'danger-soft'

interface Props extends Omit<PressableProps, 'style' | 'children'> {
  variant?: Variant
  size?: 'md' | 'lg'
  fullWidth?: boolean
  square?: boolean
  className?: string
  style?: StyleProp<ViewStyle>
  children: React.ReactNode
}

const variantClasses: Record<Variant, string> = {
  primary: 'bg-blue-600 active:bg-blue-700 border border-blue-500/40',
  danger: 'bg-red-600 active:bg-red-700 border border-red-500/40',
  ghost: 'bg-transparent active:bg-white/5 border border-transparent',
  'danger-soft': 'bg-red-500/15 active:bg-red-500/25 border border-red-500/30',
}

const variantText: Record<Variant, string> = {
  primary: 'text-white',
  danger: 'text-white',
  ghost: 'text-white',
  'danger-soft': 'text-red-300',
}

export function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  square = false,
  className = '',
  style,
  children,
  ...rest
}: Props) {
  const sizeClasses = size === 'lg' ? 'min-h-14 px-6' : 'min-h-12 px-4'
  const layout = square
    ? 'flex-col items-center justify-center gap-2'
    : 'flex-row items-center justify-center gap-2'
  const width = fullWidth ? 'w-full' : ''

  return (
    <Pressable
      {...rest}
      style={style}
      className={`${variantClasses[variant]} ${sizeClasses} ${width} rounded-2xl flex ${layout} ${className}`}
    >
      {typeof children === 'string' ? (
        <Text className={`${variantText[variant]} font-semibold text-base`}>{children}</Text>
      ) : (
        <View className={`flex ${layout} w-full`}>
          {React.Children.map(children, (child) =>
            typeof child === 'string' ? (
              <Text className={`${variantText[variant]} font-semibold text-base`}>{child}</Text>
            ) : (
              child
            )
          )}
        </View>
      )}
    </Pressable>
  )
}

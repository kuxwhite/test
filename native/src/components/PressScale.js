import { Pressable } from 'react-native'
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated'

// Pressable that springs down to `scale` while held (the "Pressed" variants in Figma).
const SPRING = { damping: 14, stiffness: 420, mass: 0.6 }
export default function PressScale({ scale = 0.96, style, containerStyle, children, onPressIn, onPressOut, ...rest }) {
  const s = useSharedValue(1)
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }))
  return (
    <Pressable
      {...rest}
      style={containerStyle}
      onPressIn={(e) => { s.value = withSpring(scale, SPRING); onPressIn?.(e) }}
      onPressOut={(e) => { s.value = withSpring(1, SPRING); onPressOut?.(e) }}
    >
      {(state) => <Animated.View style={[style, anim]}>{typeof children === 'function' ? children(state) : children}</Animated.View>}
    </Pressable>
  )
}

import { useEffect } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import Animated, { Easing, cancelAnimation, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated'
import PressScale from './PressScale'
import { Spinner } from './icons'
import { color, motion, radius, size, space, text } from '../theme/tokens'

// Figma: Search Button (103:1181) — Default / Pressed / Loading / Disabled.
// Pressed: 8% dark layer + scale .97. Loading: spinner. Disabled: 50% opacity.
export default function SearchButton({ label = 'Search', loading, disabled, onPress }) {
  const spin = useSharedValue(0)
  useEffect(() => {
    if (loading) spin.value = withRepeat(withTiming(360, { duration: 800, easing: Easing.linear }), -1)
    else { cancelAnimation(spin); spin.value = 0 }
  }, [loading, spin])
  const spinStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${spin.value}deg` }] }))
  return (
    <PressScale scale={motion.scalePressedButton} onPress={onPress} disabled={disabled || loading}
                accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ busy: loading, disabled }}>
      {({ pressed }) => (
        <View style={[s.button, disabled && s.disabled]}>
          <LinearGradient colors={[color.ctaStart, color.ctaEnd]} start={{ x: 0, y: 0.4 }} end={{ x: 1, y: 0.6 }} style={StyleSheet.absoluteFill} />
          <View style={s.glow} pointerEvents="none" />
          {pressed && <View style={s.pressed} />}
          {loading ? <Animated.View style={spinStyle}><Spinner /></Animated.View> : <Text style={s.label}>{label}</Text>}
        </View>
      )}
    </PressScale>
  )
}

const s = StyleSheet.create({
  button: { height: size.buttonH, padding: space[24], borderRadius: radius[24], overflow: 'hidden', alignItems: 'center', justifyContent: 'center', borderCurve: 'continuous' },
  glow: { ...StyleSheet.absoluteFillObject, borderRadius: radius[24], boxShadow: 'inset 0 0 44px 6px rgba(255,255,255,0.24)' },
  pressed: { ...StyleSheet.absoluteFillObject, backgroundColor: color.overlayPressedButton },
  disabled: { opacity: 0.5 },
  label: { ...text.buttonLabel, color: color.textOnBrand },
})

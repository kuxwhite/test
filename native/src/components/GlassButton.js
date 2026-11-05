import { Image, Platform, StyleSheet, View } from 'react-native'
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect'
import { BlurView } from 'expo-blur'
import * as Haptics from 'expo-haptics'
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring } from 'react-native-reanimated'
import PressScale from './PressScale'
import { HeartLineIcon, HeartSolidIcon } from './icons'
import { color, radius, size } from '../theme/tokens'

// Figma: Glass Button (104:1199) — Avatar / Favorite / Favorite Active.
// Real Liquid Glass on iOS 26 (expo-glass-effect), a blur material elsewhere.
const LIQUID = Platform.OS === 'ios' && isLiquidGlassAvailable()

function Glass({ diameter, children }) {
  const shape = { width: diameter, height: diameter, borderRadius: diameter / 2 }
  return LIQUID ? (
    <GlassView glassEffectStyle="regular" isInteractive style={[s.center, shape]}>{children}</GlassView>
  ) : (
    <View style={[s.center, shape, s.fallback]}>
      <BlurView intensity={40} tint="systemUltraThinMaterialLight" style={[StyleSheet.absoluteFill, shape]} />
      {children}
    </View>
  )
}

export default function GlassButton({ content, avatar, active, onToggle, label }) {
  const pop = useSharedValue(1)
  const popStyle = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }] }))
  if (content === 'avatar') {
    return (
      <PressScale accessibilityRole="button" accessibilityLabel={label}>
        <Glass diameter={size.glassAvatar + 8}>
          <Image source={avatar} style={s.avatar} />
        </Glass>
      </PressScale>
    )
  }
  const toggle = () => {
    const next = !active
    onToggle(next)
    Haptics.impactAsync(next ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light)
    if (next) pop.value = withSequence(withSpring(1.3, { stiffness: 600, damping: 10 }), withSpring(1, { stiffness: 400, damping: 12 }))
  }
  return (
    <PressScale onPress={toggle} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected: active }}>
      <Glass diameter={size.glassFavorite + 8}>
        <Animated.View style={popStyle}>
          {active ? <HeartSolidIcon fill={color.iconFavorite} /> : <HeartLineIcon fill={color.textPrimary} />}
        </Animated.View>
      </Glass>
    </PressScale>
  )
}

const s = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  fallback: { backgroundColor: 'rgba(250,250,250,0.55)', boxShadow: '0 8px 15px rgba(0,0,0,0.04), 0 0 0 0.5px #e8e8e8' },
  avatar: { width: size.avatar, height: size.avatar, borderRadius: radius.full },
})

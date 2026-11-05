import { StyleSheet, Text, View } from 'react-native'
import PressScale from './PressScale'
import { color, motion, radius, size, space, text } from '../theme/tokens'

// Figma: Shortcut Tile (104:1152) — Default / Pressed. The 48 px sticker overflows the top by 16 px.
export default function ShortcutTile({ Icon, label, onPress }) {
  return (
    <PressScale scale={motion.scalePressedTile} onPress={onPress} containerStyle={s.wrap} accessibilityRole="button" accessibilityLabel={label.replace('\n', ' ')}>
      {({ pressed }) => (
        <View style={[s.tile, pressed && s.pressed]}>
          <View style={s.sticker}><Icon /></View>
          <Text style={s.label}>{label}</Text>
        </View>
      )}
    </PressScale>
  )
}

const s = StyleSheet.create({
  wrap: { flex: 1 },
  tile: { height: size.tileH, paddingHorizontal: space[12], paddingVertical: space[8], gap: space[4], borderRadius: radius[20], backgroundColor: color.bgSurface, alignItems: 'center', justifyContent: 'flex-end', overflow: 'visible', borderCurve: 'continuous' },
  pressed: { backgroundColor: color.bgSurfacePressed },
  sticker: { width: size.sticker, height: size.sticker, flexShrink: 0 },
  label: { ...text.shortcutLabel, color: color.textPrimary, textAlign: 'center' },
})

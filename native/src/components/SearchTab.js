import { StyleSheet, Text, View } from 'react-native'
import PressScale from './PressScale'
import { color, motion, radius, size, space, text } from '../theme/tokens'

// Figma: Search Tab (103:1148) — Selected True/False × State Default/Pressed.
export default function SearchTab({ label, Icon, selected, onPress }) {
  return (
    <PressScale scale={motion.scalePressedTab} onPress={onPress} accessibilityRole="tab" accessibilityState={{ selected }}>
      {({ pressed }) => (
        <View style={[s.tab, selected && s.selected, pressed && s.pressed, !selected && s.idle]}>
          <Icon fill={color.iconOnBrand} />
          <Text style={s.label}>{label}</Text>
        </View>
      )}
    </PressScale>
  )
}

const s = StyleSheet.create({
  tab: { width: size.tabW, height: size.tabH, padding: space[16], gap: space[4], borderRadius: radius[24], alignItems: 'center', justifyContent: 'center', borderCurve: 'continuous' },
  selected: { backgroundColor: color.bgTabSelected },
  pressed: { backgroundColor: color.bgTabPressed },
  idle: { opacity: 0.6 },
  label: { ...text.tabLabel, color: color.textOnBrand },
})

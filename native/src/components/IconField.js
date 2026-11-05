import { useState } from 'react'
import { StyleSheet, TextInput, View } from 'react-native'
import { color, radius, size, space, text } from '../theme/tokens'

// Figma: Icon Field (110:493) — Placeholder / Filled / Focused.
// Placeholder: muted icon, Filled: dark icon, Focused: accent icon + accent caret.
export default function IconField({ Icon, label, value, placeholder, onChangeText }) {
  const [focused, setFocused] = useState(false)
  const iconColor = focused ? color.textAccent : value ? color.textPrimary : color.textMuted
  return (
    <View style={s.field}>
      <View style={s.row}>
        <Icon fill={iconColor} />
        <TextInput
          style={s.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={color.textMuted}
          selectionColor={color.textAccent}
          cursorColor={color.textAccent}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          accessibilityLabel={label}
          autoCorrect={false}
        />
      </View>
    </View>
  )
}

const s = StyleSheet.create({
  field: { height: size.fieldH, paddingHorizontal: space[24], borderRadius: radius[20], backgroundColor: color.bgSurface, alignItems: 'center', justifyContent: 'center', borderCurve: 'continuous' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  input: { ...text.fieldValue, color: color.textPrimary, padding: 0, minWidth: 60 },
})

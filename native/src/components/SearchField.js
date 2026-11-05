import { useState } from 'react'
import { StyleSheet, Text, TextInput, View } from 'react-native'
import { color, radius, size, space, text } from '../theme/tokens'

// Figma: Search Field (103:1162) — Filled / Placeholder / Focused.
// Focused: label turns accent, the native caret is accent too.
export default function SearchField({ label, value, placeholder, onChangeText }) {
  const [focused, setFocused] = useState(false)
  const state = focused ? 'focused' : value ? 'filled' : 'placeholder'
  return (
    <View style={s.field}>
      {state !== 'placeholder' && <Text style={[s.label, state === 'focused' && s.labelFocused]}>{label}</Text>}
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
  )
}

const s = StyleSheet.create({
  field: { height: size.fieldH, paddingHorizontal: space[24], paddingVertical: space[12], gap: space[4], borderRadius: radius[20], backgroundColor: color.bgSurface, alignItems: 'center', justifyContent: 'center', borderCurve: 'continuous' },
  label: { ...text.fieldLabel, color: color.textMuted },
  labelFocused: { color: color.textAccent },
  input: { ...text.fieldValue, color: color.textPrimary, textAlign: 'center', alignSelf: 'stretch', padding: 0 },
})

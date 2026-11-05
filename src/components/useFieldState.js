import { useState } from 'react'

// Field state from focus and value: Focused › Filled › Placeholder (Figma variants).
export default function useFieldState(value) {
  const [focused, setFocused] = useState(false)
  const state = focused ? 'focused' : value ? 'filled' : 'placeholder'
  return { state, focusProps: { onFocus: () => setFocused(true), onBlur: () => setFocused(false) } }
}

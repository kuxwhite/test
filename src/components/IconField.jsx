import TypedValue from './TypedValue.jsx'
import useFieldState from './useFieldState.js'

// Figma: Icon Field (110:493) — Placeholder / Filled / Focused.
// One line with a 24 px icon on the left. Placeholder: muted icon + text,
// Filled: dark icon + text, Focused: accent icon + caret.
export default function IconField({ icon, value, placeholder, onChange, label }) {
  const { state, focusProps } = useFieldState(value)
  return (
    <label className={`field icon-field is-${state}`}>
      <span className="icon-field__icon">{icon}</span>
      <TypedValue value={value} placeholder={placeholder} state={state} onChange={onChange}
                  focusProps={focusProps} label={label} />
    </label>
  )
}

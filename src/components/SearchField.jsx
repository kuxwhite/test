import TypedValue from './TypedValue.jsx'
import useFieldState from './useFieldState.js'

// Figma: Search Field (103:1162) — Filled / Placeholder / Focused.
// Filled: small label + value. Placeholder: one muted line. Focused: accent
// label + caret after the value.
export default function SearchField({ label, value, placeholder, onChange }) {
  const { state, focusProps } = useFieldState(value)
  return (
    <label className={`field search-field is-${state}`}>
      {state !== 'placeholder' && <span className="search-field__label">{label}</span>}
      <TypedValue value={value} placeholder={placeholder} state={state} onChange={onChange}
                  focusProps={focusProps} label={label} />
    </label>
  )
}

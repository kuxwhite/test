import { useRef } from 'react'

// Shared input core for Search Field and Icon Field: a real <input> on top of
// a visible mirror, so the Figma caret (2×22, accent, blinking) sits right
// after the text.
export default function TypedValue({ value, placeholder, state, onChange, focusProps, label, inputMode }) {
  const ref = useRef(null)
  return (
    <span className="typed" onPointerDown={(e) => { if (e.target !== ref.current) { e.preventDefault(); ref.current?.focus() } }}>
      <span className={'typed__mirror' + (state === 'placeholder' ? ' is-placeholder' : '')} aria-hidden="true">
        {state === 'placeholder' ? placeholder : value}
        {state === 'focused' && <span className="caret" />}
      </span>
      <input
        ref={ref}
        className="typed__input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label || placeholder}
        autoComplete="off"
        spellCheck="false"
        inputMode={inputMode}
        {...focusProps}
      />
    </span>
  )
}

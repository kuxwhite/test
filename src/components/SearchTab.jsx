// Figma: Search Tab (103:1148) — Selected True/False × State Default/Pressed.
// Pressed is the :active state in CSS (brighter pill + scale .96, spring).
export default function SearchTab({ label, icon, selected, onSelect, controls }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={selected}
      aria-controls={controls}
      className={'search-tab' + (selected ? ' is-selected' : '')}
      onClick={onSelect}
    >
      <span className="search-tab__icon">{icon}</span>
      <span className="search-tab__label">{label}</span>
    </button>
  )
}

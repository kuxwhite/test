import { Spinner } from './icons.jsx'

// Figma: Search Button (103:1181) — Default / Pressed / Loading / Disabled.
// Pressed = :active (8% dark layer + scale .97); Loading: spinner instead of
// the label; Disabled: 50% opacity.
export default function SearchButton({ label = 'Search', loading = false, disabled = false, onClick }) {
  return (
    <button
      type="submit"
      className={'search-button' + (loading ? ' is-loading' : '')}
      disabled={disabled}
      aria-busy={loading}
      onClick={onClick}
    >
      {loading ? <Spinner /> : <span>{label}</span>}
      {loading && <span className="sr-only">{label}</span>}
    </button>
  )
}

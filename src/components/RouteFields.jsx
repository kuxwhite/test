import SearchField from './SearchField.jsx'
import { Notch } from './icons.jsx'

// Figma: Route Fields (103:1163) — From (Filled) + notch + To (Placeholder).
export default function RouteFields({ from, to, onFrom, onTo }) {
  return (
    <div className="field-stack">
      <SearchField label="From" value={from} placeholder="From" onChange={onFrom} />
      <Notch />
      <SearchField label="To" value={to} placeholder="To - Vietnam" onChange={onTo} />
    </div>
  )
}

// Figma: Shortcut Tile (104:1152) — Default / Pressed.
// The 48 px sticker overflows the top edge by 16 px; Pressed = :active.
export default function ShortcutTile({ icon, label, onClick }) {
  return (
    <button type="button" className="shortcut-tile" onClick={onClick}>
      <span className="shortcut-tile__icon">{icon}</span>
      <span className="shortcut-tile__label">{label}</span>
    </button>
  )
}

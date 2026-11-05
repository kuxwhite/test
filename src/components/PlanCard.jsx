// Figma: Plan Card (104:1168) — Default / Pressed.
// Pressed = :active (12% dark layer on the photo + scale .97).
export default function PlanCard({ image, title, city, price }) {
  return (
    <a className="plan-card" href="#" onClick={(e) => e.preventDefault()}>
      <span className="plan-card__image"><img src={image} alt="" width="156" height="156" draggable="false" /></span>
      <span className="plan-card__info">
        <span className="plan-card__title">{title}</span>
        <span className="plan-card__meta">{city}</span>
        <span className="plan-card__meta">{price}</span>
      </span>
    </a>
  )
}

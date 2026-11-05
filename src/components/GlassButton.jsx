import { animate } from 'motion'
import { useRef } from 'react'
import { HeartLineIcon, HeartSolidIcon } from './icons.jsx'

// Figma: Glass Button (104:1199) — Avatar / Favorite / Favorite Active.
// Liquid Glass floating buttons; the heart pops with a spring when it turns on.
export default function GlassButton({ content, avatar, active, onToggle, label }) {
  const iconRef = useRef(null)
  if (content === 'avatar') {
    return (
      <button type="button" className="glass-button glass-button--avatar" aria-label={label}>
        <span className="glass-button__avatar"><img src={avatar} alt="" draggable="false" /></span>
      </button>
    )
  }
  const toggle = () => {
    const next = !active
    onToggle(next)
    if (next && iconRef.current && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      animate(iconRef.current, { scale: [0.6, 1.25, 1] }, { type: 'spring', stiffness: 500, damping: 14 })
    }
  }
  return (
    <button type="button" className={'glass-button glass-button--favorite' + (active ? ' is-active' : '')}
            aria-label={label} aria-pressed={active} onClick={toggle}>
      <span className="glass-button__icon" ref={iconRef}>{active ? <HeartSolidIcon /> : <HeartLineIcon />}</span>
    </button>
  )
}

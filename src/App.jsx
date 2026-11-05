import { AnimatePresence, MotionConfig, motion } from 'motion/react'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import WindowScene from './WindowScene.jsx'
import SearchTab from './components/SearchTab.jsx'
import RouteFields from './components/RouteFields.jsx'
import HotelFields from './components/HotelFields.jsx'
import SearchButton from './components/SearchButton.jsx'
import ShortcutTile from './components/ShortcutTile.jsx'
import PlanCard from './components/PlanCard.jsx'
import GlassButton from './components/GlassButton.jsx'
import {
  BedIcon, FireSticker, GlobeSticker, NavigationIcon, NavigationSticker, PlaneIcon, SparklesSticker,
} from './components/icons.jsx'
import avatar from './assets/img/avatar.png'
import whales from './assets/img/whales.jpg'
import sunrise from './assets/img/sunrise.jpg'
import kasbah from './assets/img/kasbah.jpg'
import mountains from './assets/img/mountains.jpg'
import hotelHouse from './assets/img/hotel-house.jpg'
import hotelMeadow from './assets/img/hotel-meadow.jpg'

// Figma: Handoff → code (110:755) — Flights 106:283, Hotels 110:569.
const TABS = [
  { id: 'flights', label: 'Flights', icon: <PlaneIcon /> },
  { id: 'hotels', label: 'Hotels', icon: <BedIcon /> },
  { id: 'tours', label: 'Tours', icon: <NavigationIcon /> },
]
const SHORTCUTS = [
  { label: 'Hot\ntickets', icon: <FireSticker /> },
  { label: 'Surprise me', icon: <GlobeSticker /> },
  { label: 'Smart search', icon: <SparklesSticker /> },
  { label: 'Custom route', icon: <NavigationSticker /> },
]
const PLAN_TEXT = [
  { title: 'Watch\nthe whales', city: 'Murmansk', price: 'from 5,389 ₽' },
  { title: 'Catch a sunrise\nin the sky', city: 'Murmansk', price: 'from 5,389 ₽' },
  { title: 'Take in\nthe wild nature', city: 'Murmansk', price: 'from 5,389 ₽' },
  { title: 'Hike up\nto Kazbegi', city: 'Murmansk', price: 'from 5,389 ₽' },
]
const PLAN_IMAGES = {
  flights: [whales, sunrise, kasbah, mountains],
  hotels: [hotelHouse, hotelMeadow, kasbah, mountains],
}

// Tours has no screen in Figma yet: it reuses the Flights layout.
const layoutOf = (tab) => (tab === 'hotels' ? 'hotels' : 'flights')
const EASE = [0.32, 0.72, 0, 1]
const swap = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.32, ease: EASE, delay: 0.06 } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.16, ease: 'easeIn' } },
}

// Animates the card height to whatever the current field set needs.
function AutoHeight({ children }) {
  const inner = useRef(null)
  const [height, setHeight] = useState('auto')
  useLayoutEffect(() => {
    const el = inner.current
    const ro = new ResizeObserver(() => setHeight(el.offsetHeight))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return (
    <motion.div className="search-card__body" initial={false} animate={{ height }}
                transition={{ duration: 0.45, ease: EASE }} style={{ overflow: 'clip' }}>
      <div ref={inner}>{children}</div>
    </motion.div>
  )
}

// Scroll: the hero is pinned (sticky) and the content slides over it.
// - pause the scene once the sheet fully covers the hero (IntersectionObserver);
// - where scroll-driven animations are missing, drive the recede with rAF.
function useHeroCover(heroRef, sentinelRef) {
  const [heroVisible, setHeroVisible] = useState(true)
  useEffect(() => {
    const io = new IntersectionObserver(([e]) => setHeroVisible(e.isIntersecting || e.boundingClientRect.top > 0))
    io.observe(sentinelRef.current)
    return () => io.disconnect()
  }, [sentinelRef])
  useEffect(() => {
    if (CSS.supports('animation-timeline: scroll()')) return
    const scene = heroRef.current.querySelector('.scene')
    const dim = heroRef.current.querySelector('.scene-dim')
    const css = getComputedStyle(document.documentElement)
    const dist = parseFloat(css.getPropertyValue('--recede-distance')) || 300
    const scale = parseFloat(css.getPropertyValue('--recede-scale')) || 1.06
    const maxDim = parseFloat(css.getPropertyValue('--recede-dim')) || 0.15
    const frame = { id: 0 }
    const paint = () => {
      frame.id = 0
      const k = Math.min(Math.max(window.scrollY / dist, 0), 1)
      scene.style.transform = `translate3d(0, ${-0.3 * dist * k}px, 0) scale(${1 + (scale - 1) * k})`
      dim.style.opacity = String(maxDim * k)
    }
    const onScroll = () => { if (!frame.id) frame.id = requestAnimationFrame(paint) }
    window.addEventListener('scroll', onScroll, { passive: true })
    paint()
    return () => { window.removeEventListener('scroll', onScroll); cancelAnimationFrame(frame.id) }
  }, [heroRef])
  return heroVisible
}

export default function App() {
  const heroRef = useRef(null)
  const sentinelRef = useRef(null)
  const heroVisible = useHeroCover(heroRef, sentinelRef)
  const [tab, setTab] = useState('flights')
  const [route, setRoute] = useState({ from: 'Perm', to: '' })
  const [hotel, setHotel] = useState({ destination: '', dates: '', guests: '2 adults' })
  const [loading, setLoading] = useState(false)
  const [liked, setLiked] = useState(true) // both Figma screens show Favorite Active
  const layout = layoutOf(tab)

  const submit = (e) => {
    e.preventDefault()
    if (loading) return
    setLoading(true)
    setTimeout(() => setLoading(false), 1400)
  }

  return (
    <MotionConfig reducedMotion="user">
      <main className="screen">
        <header className="hero" ref={heroRef}>
          <WindowScene tab={tab} visible={heroVisible} />
        </header>

        <div className="content">
          <div className="hero-sentinel" ref={sentinelRef} aria-hidden />
          <section className="search-card" aria-label="Search">
            <div className="search-tabs" role="tablist" aria-label="Search type">
              {TABS.map((t) => (
                <SearchTab key={t.id} label={t.label} icon={t.icon} selected={tab === t.id}
                           controls="search-panel" onSelect={() => setTab(t.id)} />
              ))}
            </div>

            <AutoHeight>
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.form key={layout} id="search-panel" role="tabpanel" className="search-card__form"
                             onSubmit={submit} {...swap}>
                  {layout === 'hotels' ? (
                    <HotelFields {...hotel}
                                 onDestination={(v) => setHotel((h) => ({ ...h, destination: v }))}
                                 onDates={(v) => setHotel((h) => ({ ...h, dates: v }))}
                                 onGuests={(v) => setHotel((h) => ({ ...h, guests: v }))} />
                  ) : (
                    <RouteFields {...route}
                                 onFrom={(v) => setRoute((r) => ({ ...r, from: v }))}
                                 onTo={(v) => setRoute((r) => ({ ...r, to: v }))} />
                  )}
                  <SearchButton label={layout === 'hotels' ? 'Search hotels' : tab === 'tours' ? 'Search tours' : 'Search'}
                                loading={loading} />
                </motion.form>
              </AnimatePresence>
            </AutoHeight>
          </section>

          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={layout} className={'below below--' + layout} {...swap}>
              {layout === 'flights' && (
                <nav className="shortcuts" aria-label="Shortcuts">
                  {SHORTCUTS.map((s) => <ShortcutTile key={s.label} icon={s.icon} label={s.label} />)}
                </nav>
              )}
              <section className="plans" aria-label="Plans for autumn">
                {layout === 'flights' && <h2 className="plans__title">Plans for autumn</h2>}
                <div className="plans__row">
                  {PLAN_TEXT.map((p, i) => (
                    <PlanCard key={p.title} image={PLAN_IMAGES[layout][i]} {...p} />
                  ))}
                </div>
              </section>
            </motion.div>
          </AnimatePresence>
        </div>

        <nav className="tab-bar" aria-label="Account">
          <GlassButton content="avatar" avatar={avatar} label="Profile" />
          <GlassButton content="favorite" active={liked} onToggle={setLiked} label="Favourites" />
        </nav>
      </main>
    </MotionConfig>
  )
}

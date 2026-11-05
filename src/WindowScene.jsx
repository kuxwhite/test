import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { animate } from 'motion'
import { LiveScene, webgl2Available } from './scenes/LiveScene.js'
import { GullFlock } from './scenes/gulls.js'
import { SCENE_CONFIG as C } from './scenes/config.js'

/*
 * «Вид из окна» as a cinemagraph — HANDOFF.md §2, §4 and the living-scene brief.
 *
 * Each scene is a box the size of its illustration, centred in the hero, so the
 * plane glass and the hotel opening sit at the same height (y ≈ 152). Inside the
 * box a WebGL canvas re-renders the illustration with motion inside masks
 * (src/scenes/*). The hotel box also holds the gull layer.
 *
 * Tab change: crossfade + scale + short blur on the boxes (Motion, interruptible),
 * both scenes keep living during it. Tilt/finger parallax goes into the shader
 * as a uniform. Scenes run only while visible: hero not covered, tab not hidden.
 */

const BASE = import.meta.env.BASE_URL
const ORIGIN_Y = 152 // hero y of both openings' centre
const SCENES = {
  flights: { height: 358, top: -57, width: 537 },
  hotels: { height: 321, top: 0, width: 481.5 },
}
const sceneOf = (tab) => (tab === 'flights' ? 'flights' : 'hotels')
const EASE = [0.32, 0.72, 0, 1]
const TRANSITION_MS = 650
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

export default function WindowScene({ tab, visible = true }) {
  const active = sceneOf(tab)
  const rootRef = useRef(null)
  const sceneRefs = useRef({})
  const canvasRefs = useRef({})
  const gullLayerRef = useRef(null)
  const live = useRef({})
  const flock = useRef(null)
  const first = useRef(true)
  const [fallback, setFallback] = useState(false)
  // run state lives in a ref: changing it never re-renders
  const run = useRef({ active, visible, hidden: document.hidden, transitionUntil: 0, timer: 0 })

  const updateRunning = () => {
    const r = run.current
    const on = r.visible && !r.hidden
    const inTransition = performance.now() < r.transitionUntil
    for (const id of Object.keys(SCENES)) {
      const scene = live.current[id]
      if (!scene) continue
      if (on && (id === r.active || inTransition)) scene.start()
      else scene.stop()
    }
    if (flock.current) {
      if (on && r.active === 'hotels' && !reducedMotion()) flock.current.start()
      else flock.current.stop()
    }
  }

  // ---- create the WebGL scenes --------------------------------------------
  useEffect(() => {
    if (!webgl2Available()) { setFallback(true); return }
    const scenes = {}
    for (const [id, s] of Object.entries(SCENES)) {
      scenes[id] = new LiveScene(canvasRefs.current[id], id, { cssHeight: s.height })
      scenes[id].ready.then(updateRunning).catch((err) => { console.warn('[WindowScene] static fallback:', err.message); setFallback(true) })
    }
    live.current = scenes
    const gulls = new GullFlock(gullLayerRef.current, SCENES.hotels.height / 1024)
    flock.current = gulls
    const onResize = () => Object.values(scenes).forEach((sc) => sc.resize())
    const onVisibility = () => { run.current.hidden = document.hidden; updateRunning() }
    window.addEventListener('resize', onResize)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.removeEventListener('resize', onResize)
      document.removeEventListener('visibilitychange', onVisibility)
      Object.values(scenes).forEach((sc) => sc.destroy())
      gulls.destroy()
      live.current = {}
      flock.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // hero covered / uncovered (from App's IntersectionObserver)
  useEffect(() => {
    run.current.visible = visible
    updateRunning()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible])

  // ---- tab change: crossfade + scale + short blur, interruptible ----------
  useLayoutEffect(() => {
    const reduce = reducedMotion()
    const r = run.current
    r.active = active
    if (!first.current) {
      r.transitionUntil = performance.now() + TRANSITION_MS
      clearTimeout(r.timer)
      r.timer = setTimeout(updateRunning, TRANSITION_MS + 20)
    }
    updateRunning()
    for (const id of Object.keys(SCENES)) {
      const el = sceneRefs.current[id]
      if (!el) continue
      const incoming = id === active
      el.setAttribute('aria-hidden', String(!incoming))
      if (first.current) { el.style.opacity = incoming ? '1' : '0'; continue }
      const opacity = parseFloat(getComputedStyle(el).opacity)
      const opts = { duration: TRANSITION_MS / 1000, ease: EASE }
      if (reduce) { animate(el, { opacity: incoming ? 1 : 0 }, opts); continue }
      if (incoming && opacity < 0.02) el.style.transform = 'scale(0.98)'
      animate(el, { opacity: incoming ? 1 : 0, scale: incoming ? 1 : 1.02, filter: [null, 'blur(6px)', 'blur(0px)'] }, opts)
    }
    first.current = false
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active])

  // ---- tilt + finger parallax (±4 css px), spring, uniforms only ----------
  useEffect(() => {
    if (reducedMotion()) return
    const root = rootRef.current
    const tilt = { x: 0, y: 0 }, drag = { x: 0, y: 0 }
    const pos = { x: 0, y: 0, vx: 0, vy: 0 }
    const loop = { raf: 0, last: 0 }
    const tiltBase = { g: 0, b: 0, set: false }
    const dragState = { start: null }
    const orient = { listening: false }
    const clamp = (v, a = 1) => Math.max(-a, Math.min(a, v))
    const apply = () => {
      for (const sc of Object.values(live.current)) sc.setParallax(pos.x * C.tilt.amp, pos.y * C.tilt.amp)
    }
    const step = (now) => {
      const dt = Math.min((now - (loop.last || now)) / 1000, 1 / 30) || 1 / 60
      loop.last = now
      const tx = clamp(tilt.x + drag.x), ty = clamp(tilt.y + drag.y)
      const k = 90, c = 16
      pos.vx += (k * (tx - pos.x) - c * pos.vx) * dt
      pos.vy += (k * (ty - pos.y) - c * pos.vy) * dt
      pos.x += pos.vx * dt
      pos.y += pos.vy * dt
      apply()
      const settled = Math.abs(tx - pos.x) < 1e-3 && Math.abs(ty - pos.y) < 1e-3 && Math.abs(pos.vx) < 1e-3 && Math.abs(pos.vy) < 1e-3
      loop.raf = settled ? 0 : requestAnimationFrame(step)
      if (settled) loop.last = 0
    }
    const kick = () => { if (!loop.raf) loop.raf = requestAnimationFrame(step) }
    const onOrientation = (e) => {
      if (e.gamma == null || e.beta == null) return
      if (!tiltBase.set) Object.assign(tiltBase, { g: e.gamma, b: e.beta, set: true })
      tiltBase.g += (e.gamma - tiltBase.g) * 0.004 // the neutral pose follows the hand slowly
      tiltBase.b += (e.beta - tiltBase.b) * 0.004
      tilt.x = clamp((e.gamma - tiltBase.g) / 18)
      tilt.y = clamp((e.beta - tiltBase.b) / 18) * 0.6
      kick()
    }
    const listen = () => {
      if (orient.listening) return
      orient.listening = true
      window.addEventListener('deviceorientation', onOrientation)
    }
    const needsPermission = typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function'
    if (!needsPermission) listen()
    const onTap = () => { // iOS: ask for motion access on a tap on the header
      if (!needsPermission || orient.listening) return
      DeviceOrientationEvent.requestPermission().then((s) => { if (s === 'granted') listen() }).catch(() => {})
    }
    const onDown = (e) => { dragState.start = { x: e.clientX, y: e.clientY, id: e.pointerId } }
    const onMove = (e) => {
      if (!dragState.start || e.pointerId !== dragState.start.id) return
      drag.x = clamp((e.clientX - dragState.start.x) / 70)
      drag.y = clamp((e.clientY - dragState.start.y) / 110) * 0.6
      kick()
    }
    const onUp = () => { dragState.start = null; drag.x = drag.y = 0; kick() }
    root.addEventListener('pointerdown', onDown)
    root.addEventListener('click', onTap)
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    return () => {
      cancelAnimationFrame(loop.raf)
      root.removeEventListener('pointerdown', onDown)
      root.removeEventListener('click', onTap)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
      window.removeEventListener('deviceorientation', onOrientation)
    }
  }, [])

  return (
    <div className="scene" ref={rootRef}>
      {Object.entries(SCENES).map(([id, s]) => (
        <div key={id} className="ws-scene" ref={(el) => { sceneRefs.current[id] = el }}
             style={{ width: s.width, height: s.height, top: s.top, transformOrigin: `50% ${ORIGIN_Y - s.top}px` }}>
          {fallback
            ? <img className="ws-img" src={`${BASE}scenes/${id}.png`} alt="" draggable="false" />
            : <canvas className="ws-canvas" ref={(el) => { canvasRefs.current[id] = el }} />}
          {id === 'hotels' && (
            <div className="ws-gulls" ref={gullLayerRef}
                 style={{ WebkitMaskImage: `url(${BASE}scenes/masks/hotels-sky-alpha.png)`, maskImage: `url(${BASE}scenes/masks/hotels-sky-alpha.png)` }} />
          )}
        </div>
      ))}
      <div className="scene-dim" aria-hidden />
    </div>
  )
}

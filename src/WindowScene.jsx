import { useEffect, useLayoutEffect, useRef } from 'react'
import { animate } from 'motion'

/*
 * «Вид из окна» — HANDOFF.md, sections 2, 4, 5.
 *
 * Each scene is a box the size of its illustration, centred in the hero, so
 * the plane glass and the hotel opening sit at the same height (y ≈ 152).
 * Inside a box:
 *   base     — the illustration, static (interior);
 *   view     — a copy masked to the opening, slightly enlarged, moved by
 *              parallax (tilt + finger);
 *   clouds   — plane only: the clouds below the horizon, a bit larger,
 *              drifting slowly back and forth (seamless ping-pong loop);
 *   breathe  — hotel only: the view slowly zooms in and out;
 *   curtain  — hotel only: a copy masked to the tulle, swaying gently.
 * Masks are derived from the illustrations by scripts/make-scene-fx.py.
 *
 * Only transform / opacity / filter are animated. Parallax writes transforms
 * straight to the elements through refs, never through React state.
 */

const SRC_H = 1024
const BASE = import.meta.env.BASE_URL
const ORIGIN_Y = 152 // hero y of both openings' centre

const SCENES = {
  flights: {
    height: 358, top: -57, width: 537,
    opening: { x: 766, y: 598 },  // centre of the glass, source px
    zoom: 1.1, amp: 4.5,          // zoom leaves ≥ amp px of slack at the glass edge
    clouds: { horizon: 580, zoom: 1.15, drift: 8, seconds: 11 }, // source px, ×, ±css px, s per pass
  },
  hotels: {
    height: 321, top: 0, width: 481.5,
    opening: { x: 764, y: 485 },
    zoom: 1.1, amp: 8,
    breathe: { zoom: 1.035, seconds: 9 },
    curtain: { x: 1350, y: 0, angle: 0.9, seconds: 4.5 }, // the tulle hangs from here
  },
}

// Mask longhands, prefixed and not: the shorthand with var() is fragile in Safari.
const maskStyle = (url) => ({
  WebkitMaskImage: `url(${url})`, maskImage: `url(${url})`,
  WebkitMaskSize: '100% 100%', maskSize: '100% 100%',
  WebkitMaskRepeat: 'no-repeat', maskRepeat: 'no-repeat',
})
const fadeFrom = (y) => {
  const g = `linear-gradient(to bottom, transparent ${y}px, #000 ${y + 16}px)`
  return { WebkitMaskImage: g, maskImage: g }
}

const sceneOf = (tab) => (tab === 'flights' ? 'flights' : 'hotels')
const EASE = [0.32, 0.72, 0, 1]
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

export default function WindowScene({ tab }) {
  const active = sceneOf(tab)
  const rootRef = useRef(null)
  const sceneRefs = useRef({})
  const moveRefs = useRef({})
  const first = useRef(true)

  // ---- tab change: crossfade + scale + short blur, interruptible ----------
  useLayoutEffect(() => {
    const reduce = reducedMotion()
    for (const id of Object.keys(SCENES)) {
      const el = sceneRefs.current[id]
      if (!el) continue
      const incoming = id === active
      el.classList.toggle('is-active', incoming)
      el.setAttribute('aria-hidden', String(!incoming))

      if (first.current) {
        el.style.opacity = incoming ? '1' : '0'
        continue
      }
      const opacity = parseFloat(getComputedStyle(el).opacity)
      const opts = { duration: 0.6, ease: EASE }
      if (reduce) {
        animate(el, { opacity: incoming ? 1 : 0 }, opts)
        continue
      }
      // a scene coming in from fully hidden starts slightly small
      if (incoming && opacity < 0.02) el.style.transform = 'scale(0.98)'
      animate(el, {
        opacity: incoming ? 1 : 0,
        scale: incoming ? 1 : 1.02,
        filter: [null, 'blur(6px)', 'blur(0px)'],
      }, opts)
    }
    first.current = false
  }, [active])

  // ---- idle life: clouds, breathing view, curtain (Web Animations API) ------
  const idleRefs = useRef({})
  const idleAnims = useRef({})
  useEffect(() => {
    if (reducedMotion()) return
    const loop = (el, frames, seconds) => el && el.animate(frames, {
      duration: seconds * 1000, iterations: Infinity, direction: 'alternate', easing: 'ease-in-out',
    })
    const f = SCENES.flights.clouds, h = SCENES.hotels
    const anims = {
      flights: [loop(idleRefs.current.clouds, [
        { transform: `translate3d(${f.drift}px, 0, 0) scale(${f.zoom})` },
        { transform: `translate3d(${-f.drift}px, 0, 0) scale(${f.zoom})` },
      ], f.seconds)],
      hotels: [
        loop(idleRefs.current.breathe, [{ transform: 'scale(1)' }, { transform: `scale(${h.breathe.zoom})` }], h.breathe.seconds),
        loop(idleRefs.current.curtain, [
          { transform: `rotate(${-h.curtain.angle}deg) skewX(${h.curtain.angle * 0.6}deg)` },
          { transform: `rotate(${h.curtain.angle}deg) skewX(${-h.curtain.angle * 0.6}deg)` },
        ], h.curtain.seconds),
      ],
    }
    idleAnims.current = anims
    return () => Object.values(anims).flat().forEach((a) => a && a.cancel())
  }, [])
  useEffect(() => { // only the visible scene keeps moving
    for (const [id, list] of Object.entries(idleAnims.current)) {
      for (const a of list) {
        if (!a) continue
        if (id === active) a.play()
        else a.pause()
      }
    }
  }, [active])

  // ---- parallax: tilt + finger, spring, refs only --------------------------
  useEffect(() => {
    if (reducedMotion()) return
    const root = rootRef.current
    const tilt = { x: 0, y: 0 }
    const drag = { x: 0, y: 0 }
    const pos = { x: 0, y: 0, vx: 0, vy: 0 }
    const tiltBase = { g: 0, b: 0, set: false }
    const loop = { raf: 0, last: 0 }
    const dragState = { start: null }

    const clamp = (v, a = 1) => Math.max(-a, Math.min(a, v))

    const apply = () => {
      for (const id of Object.keys(SCENES)) {
        const el = moveRefs.current[id]
        if (!el) continue
        const { amp, zoom } = SCENES[id]
        el.style.transform =
          `translate3d(${(pos.x * amp).toFixed(2)}px, ${(pos.y * amp).toFixed(2)}px, 0) scale(${zoom})`
      }
    }

    const step = (now) => {
      const dt = Math.min((now - (loop.last || now)) / 1000, 1 / 30) || 1 / 60
      loop.last = now
      const tx = clamp(tilt.x + drag.x)
      const ty = clamp(tilt.y + drag.y)
      // soft, slightly under-damped spring: no jerks
      const k = 90, c = 16
      pos.vx += (k * (tx - pos.x) - c * pos.vx) * dt
      pos.vy += (k * (ty - pos.y) - c * pos.vy) * dt
      pos.x += pos.vx * dt
      pos.y += pos.vy * dt
      apply()
      const settled = Math.abs(tx - pos.x) < 1e-3 && Math.abs(ty - pos.y) < 1e-3 &&
        Math.abs(pos.vx) < 1e-3 && Math.abs(pos.vy) < 1e-3
      loop.raf = settled ? 0 : requestAnimationFrame(step)
      if (settled) loop.last = 0
    }
    const kick = () => { if (!loop.raf) loop.raf = requestAnimationFrame(step) }

    const onOrientation = (e) => {
      if (e.gamma == null || e.beta == null) return
      if (!tiltBase.set) Object.assign(tiltBase, { g: e.gamma, b: e.beta, set: true })
      // the neutral pose follows the hand slowly, so the view re-centres
      tiltBase.g += (e.gamma - tiltBase.g) * 0.004
      tiltBase.b += (e.beta - tiltBase.b) * 0.004
      tilt.x = clamp((e.gamma - tiltBase.g) / 18)
      tilt.y = clamp((e.beta - tiltBase.b) / 18) * 0.6
      kick()
    }

    const orient = { listening: false }
    const listen = () => {
      if (orient.listening) return
      orient.listening = true
      window.addEventListener('deviceorientation', onOrientation)
    }
    const needsPermission = typeof DeviceOrientationEvent !== 'undefined' &&
      typeof DeviceOrientationEvent.requestPermission === 'function'
    if (!needsPermission) listen()

    // iOS: ask for motion access on the first tap on the header
    const onTap = () => {
      if (!needsPermission || orient.listening) return
      DeviceOrientationEvent.requestPermission()
        .then((state) => { if (state === 'granted') listen() })
        .catch(() => {})
    }

    const onDown = (e) => {
      dragState.start = { x: e.clientX, y: e.clientY, id: e.pointerId }
    }
    const onMove = (e) => {
      if (!dragState.start || e.pointerId !== dragState.start.id) return
      drag.x = clamp((e.clientX - dragState.start.x) / 70)
      drag.y = clamp((e.clientY - dragState.start.y) / 110) * 0.6
      kick()
    }
    const onUp = () => {
      dragState.start = null
      drag.x = drag.y = 0
      kick()
    }

    root.addEventListener('pointerdown', onDown)
    root.addEventListener('click', onTap)
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    apply()
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
      {Object.entries(SCENES).map(([id, s]) => {
        const k = s.height / SRC_H // source px → css px
        const src = `${BASE}scenes/${id}.png`
        const box = {
          width: s.width, height: s.height, top: s.top,
          transformOrigin: `50% ${ORIGIN_Y - s.top}px`,
        }
        const viewOrigin = `${s.opening.x * k}px ${s.opening.y * k}px`
        return (
          <div key={id} className="ws-scene" style={box} ref={(el) => { sceneRefs.current[id] = el }}>
            <img className="ws-img" src={src} alt="" draggable="false" />

            <div className="ws-view" style={maskStyle(`${BASE}scenes/fx/${id}-view-mask.png`)}>
              <div className="ws-move" style={{ transformOrigin: viewOrigin, transform: `scale(${s.zoom})` }}
                   ref={(el) => { moveRefs.current[id] = el }}>
                <div className="ws-layer" style={{ transformOrigin: viewOrigin }}
                     ref={s.breathe ? (el) => { idleRefs.current.breathe = el } : undefined}>
                  <img className="ws-img" src={src} alt="" draggable="false" />
                </div>
                {s.clouds && (
                  <div className="ws-layer" style={{
                    transformOrigin: viewOrigin, transform: `scale(${s.clouds.zoom})`,
                    ...fadeFrom(s.clouds.horizon * k),
                  }} ref={(el) => { idleRefs.current.clouds = el }}>
                    <img className="ws-img" src={src} alt="" draggable="false" />
                  </div>
                )}
              </div>
            </div>

            {s.curtain && (
              <div className="ws-curtain" style={{
                ...maskStyle(`${BASE}scenes/fx/hotels-curtain-mask.png`),
                transformOrigin: `${s.curtain.x * k}px ${s.curtain.y * k}px`,
              }} ref={(el) => { idleRefs.current.curtain = el }}>
                <img className="ws-img" src={src} alt="" draggable="false" />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

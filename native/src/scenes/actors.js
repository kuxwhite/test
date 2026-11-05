import { Group, LinearGradient, Path, Rect, Skia, vec } from '@shopify/react-native-skia'
import { useDerivedValue } from 'react-native-reanimated'
import { SCENE_CONFIG as C } from './config'

/*
 * Actors drawn in Skia inside the scene (and clipped by its mask): airliners and
 * bird flocks behind the porthole; gulls, sailboats, cars and people in the hotel
 * view. Everything is a pure function of the scene clock, so it pauses and
 * resumes with the scene. Each actor "slot" repeats every L seconds; inside a
 * cycle the start, speed, direction and colour are picked by a hash of the cycle.
 * Positions are source pixels of the picture, mapped to canvas by the box.
 */

const P = (d) => Skia.Path.MakeFromSVGString(d)
const SHAPES = {
  wing: P('M1 6 Q5 0.8 10 5 Q15 0.8 19 6'),
  planeBody: P('M41 6 L45.5 5 H56.5 Q59 6 56.5 7 H45.5 Z'),
  planeWingTop: P('M48.5 6 L52.5 1.2 H54 L52 6 Z'),
  planeWingBottom: P('M48.5 6.2 L52.5 10.8 H54 L52 6.2 Z'),
  planeTail: P('M44.5 5.2 L43.4 2.3 H44.9 L46.6 5.2 Z'),
  carRoof: P('M3.4 2.7 L5 0.8 H9.4 L11 2.7 Z'),
  carWindow: P('M5.4 1.3 H9.1 L10.1 2.6 H4.5 Z'),
  carBody: P('M1.7 2.5 H12.3 Q13.5 2.5 13.5 3.7 V4.3 Q13.5 5.5 12.3 5.5 H1.7 Q0.5 5.5 0.5 4.3 V3.7 Q0.5 2.5 1.7 2.5 Z'),
  wheels: P('M2.45 5.7 a1.15 1.15 0 1 0 2.3 0 a1.15 1.15 0 1 0 -2.3 0 M9.25 5.7 a1.15 1.15 0 1 0 2.3 0 a1.15 1.15 0 1 0 -2.3 0'),
  head: P('M0.75 1.4 a1.25 1.25 0 1 0 2.5 0 a1.25 1.25 0 1 0 -2.5 0'),
  torso: P('M1.8 2.9 H2.2 Q3.3 2.9 3.3 4 V5.8 Q3.3 6.9 2.2 6.9 H1.8 Q0.7 6.9 0.7 5.8 V4 Q0.7 2.9 1.8 2.9 Z'),
  legs: P('M1.5 6.6 V9.6 M2.5 6.6 V9.6'),
  sail1: P('M6 0.5 V9 H1.4 Z'),
  sail2: P('M6.6 2 V9 H10.3 Z'),
  hull: P('M1 9.6 H11 L9.4 12 H2.6 Z'),
}
const CAR_COLORS = ['#e2574c', '#f4f1ea', '#f2c14e', '#5b8bd9', '#7fb069', '#ffffff']
const CLOTHES = ['#e85d75', '#3d7dd8', '#f2c14e', '#ffffff', '#5aa469', '#f08a4b']
const HULLS = ['#c8553d', '#3d6fb4', '#ffffff']

// ---------------------------------------------------------------- worklet math
function hash(n) { 'worklet'; const x = Math.sin(n * 12.9898) * 43758.5453; return x - Math.floor(x) }

// Where a slot is in its cycle: u in [0,1] while the actor is on stage, else -1.
function slot(t, L, phase, seed, crossMin, crossMax) {
  'worklet'
  const tt = t + phase
  const k = Math.floor(tt / L)
  const local = tt - k * L
  const h1 = hash(k * 1.7 + seed), h2 = hash(k * 3.1 + seed * 2.3), h3 = hash(k * 5.3 + seed * 3.7)
  const cross = crossMin + (crossMax - crossMin) * h1
  const delay = (L - cross) * h2
  const u = (local - delay) / cross
  return { u: u >= 0 && u <= 1 ? u : -1, h1, h2, h3, k }
}

// Point on a polyline [[x, y, s], …] at u (by length).
function along(pts, lens, total, u) {
  'worklet'
  let d = u * total
  for (let i = 0; i < lens.length; i++) {
    if (d <= lens[i] || i === lens.length - 1) {
      const f = lens[i] ? Math.min(d / lens[i], 1) : 0
      const a = pts[i], b = pts[i + 1]
      return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f]
    }
    d -= lens[i]
  }
  return pts[0]
}
function measure(pts) {
  const lens = pts.slice(1).map((p, i) => Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]))
  return { pts, lens, total: lens.reduce((a, b) => a + b, 0) }
}
const fadeOf = (u, f) => { 'worklet'; return u < 0 ? 0 : Math.min(1, u / f, (1 - u) / f) }

// ---------------------------------------------------------------- components
// box = { left, top, k } maps source px → canvas.
function useActor(time, box, compute) {
  const state = useDerivedValue(() => compute(time.value))
  const transform = useDerivedValue(() => {
    const s = state.value
    return [{ translateX: box.left + s.x * box.k }, { translateY: box.top + s.y * box.k }, { scaleX: s.sx }, { scaleY: s.sy }]
  })
  const opacity = useDerivedValue(() => state.value.o)
  return { state, transform, opacity }
}

function Airliner({ time, box, seed, phase }) {
  const cfg = C.flights.planes, L = 19
  const { transform, opacity } = useActor(time, box, (t) => {
    'worklet'
    const s = slot(t, L, phase, seed, cfg.cross[0], cfg.cross[1])
    const ltr = s.h3 < 0.5, y = cfg.y[0] + (cfg.y[1] - cfg.y[0]) * s.h2
    const x0 = 560, x1 = 960, u = Math.max(s.u, 0)
    const size = (0.7 + 0.35 * s.h1) * (44 / 60) // 44 css px wide (canvas px per viewBox unit)
    return { x: ltr ? x0 + (x1 - x0) * u : x1 - (x1 - x0) * u, y: y + (ltr ? -8 : 4) * u, sx: (ltr ? 1 : -1) * size, sy: size, o: fadeOf(s.u, 0.04) }
  })
  return (
    <Group transform={transform} opacity={opacity}>
      <Rect x={0} y={5.3} width={42} height={1.3}>
        <LinearGradient start={vec(0, 0)} end={vec(42, 0)} colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.85)']} />
      </Rect>
      <Path path={SHAPES.planeBody} color="#fbfdff" />
      <Path path={SHAPES.planeWingTop} color="#e9eff8" />
      <Path path={SHAPES.planeWingBottom} color="#dfe7f2" />
      <Path path={SHAPES.planeTail} color="#e9eff8" />
    </Group>
  )
}

function Bird({ time, box, i, colour, scheduleFn, flaps }) {
  const { transform, opacity } = useActor(time, box, (t) => { 'worklet'; return scheduleFn(t, i) })
  const flap = useDerivedValue(() => [{ translateY: 5 }, { scaleY: 1 - 1.4 * (0.5 + 0.5 * Math.sin((time.value / flaps + i * 0.37) * Math.PI)) }, { translateY: -5 }])
  return (
    <Group transform={transform} opacity={opacity}>
      <Group transform={flap}>
        <Path path={SHAPES.wing} color={colour} style="stroke" strokeWidth={1.6} strokeCap="round" strokeJoin="round" />
      </Group>
    </Group>
  )
}

export function FlightsActors({ time, box }) {
  const cfg = C.flights.birds
  // one flock slot; birds in formation, 3–5 of them by cycle
  const flock = (t, i) => {
    'worklet'
    const s = slot(t, 7, 1.3, 9.1, cfg.cross[0], cfg.cross[1])
    const n = Math.round(cfg.flock[0] + (cfg.flock[1] - cfg.flock[0]) * s.h3)
    const ltr = s.h1 < 0.65, y = cfg.y[0] + (cfg.y[1] - cfg.y[0]) * s.h2
    const lag = i * 0.03, u = Math.min(Math.max(s.u - lag, 0), 1)
    const dy = (i % 2 ? 1 : -1) * Math.ceil(i / 2) * 12
    const x0 = 580, x1 = 950, size = (0.9 + 0.3 * hash(i + s.k)) * (9 / 20)
    return { x: (ltr ? x0 + (x1 - x0) * u : x1 - (x1 - x0) * u) - (ltr ? 1 : -1) * i * 14, y: y + dy - 30 * u, sx: size, sy: size,
      o: i < n && s.u >= 0 ? fadeOf(u, 0.05) : 0 }
  }
  return (
    <>
      <Airliner time={time} box={box} seed={2.2} phase={0} />
      <Airliner time={time} box={box} seed={6.7} phase={9.5} />
      {[0, 1, 2, 3, 4].map((i) => <Bird key={i} time={time} box={box} i={i} colour="#3a4a60" scheduleFn={flock} flaps={cfg.flaps} />)}
    </>
  )
}

// ---- hotels
const ROAD = measure([[690, 612, 1], [760, 599, 0.94], [830, 586, 0.86], [900, 571, 0.78], [960, 558, 0.7], [1012, 547, 0.64]])
const SHORE = measure([[478, 638, 1], [560, 639, 1], [640, 636, 0.97], [712, 627, 0.92]])

function Car({ time, box, seed, phase }) {
  const cfg = C.hotels.cars, pts = ROAD.pts, lens = ROAD.lens, total = ROAD.total
  const { state, transform, opacity } = useActor(time, box, (t) => {
    'worklet'
    const s = slot(t, 11.25, phase, seed, cfg.cross[0], cfg.cross[1])
    const away = s.h3 < 0.5, u = Math.max(s.u, 0)
    const p = along(pts, lens, total, away ? u : 1 - u)
    const size = p[2] * (9 / 14)
    return { x: p[0], y: p[1] - 14, sx: (away ? 1 : -1) * size, sy: size, o: fadeOf(s.u, 0.07), c: Math.floor(s.h1 * 6) }
  })
  const paint = useDerivedValue(() => CAR_COLORS[state.value.c % 6])
  return (
    <Group transform={transform} opacity={opacity}>
      <Path path={SHAPES.carRoof} color={paint} />
      <Path path={SHAPES.carWindow} color="#d6ecf8" />
      <Path path={SHAPES.carBody} color={paint} />
      <Path path={SHAPES.wheels} color="#2f3640" />
    </Group>
  )
}

function Person({ time, box, seed, phase }) {
  const cfg = C.hotels.people, pts = SHORE.pts, lens = SHORE.lens, total = SHORE.total
  const { state, transform, opacity } = useActor(time, box, (t) => {
    'worklet'
    const s = slot(t, 36, phase, seed, cfg.cross[0], cfg.cross[1])
    const right = s.h3 < 0.5, u = Math.max(s.u, 0)
    const p = along(pts, lens, total, right ? u : 1 - u)
    const size = p[2] * (9 / 10)
    const bob = Math.abs(Math.sin(t * 6 + seed)) * 1.2
    return { x: p[0], y: p[1] - bob, sx: size, sy: size, o: fadeOf(s.u, 0.06), c: Math.floor(s.h1 * 6) }
  })
  const shirt = useDerivedValue(() => CLOTHES[state.value.c % 6])
  return (
    <Group transform={transform} opacity={opacity}>
      <Path path={SHAPES.head} color="#e9b98f" />
      <Path path={SHAPES.torso} color={shirt} />
      <Path path={SHAPES.legs} color="#3b4252" style="stroke" strokeWidth={0.8} strokeCap="round" />
    </Group>
  )
}

function Boat({ time, box, seed, phase }) {
  const cfg = C.hotels.boats
  const { state, transform, opacity } = useActor(time, box, (t) => {
    'worklet'
    const s = slot(t, 42, phase, seed, cfg.cross[0], cfg.cross[1])
    const ltr = s.h3 < 0.5, u = Math.max(s.u, 0)
    const y = 562 + 62 * s.h2, size = (0.55 + ((y - 562) / 62) * 0.5) * (9 / 12)
    const x0 = 470, x1 = 860
    return { x: ltr ? x0 + (x1 - x0) * u : x1 - (x1 - x0) * u, y: y + Math.sin(t * 1.9 + seed) * 1.5, sx: (ltr ? 1 : -1) * size, sy: size, o: fadeOf(s.u, 0.06), c: Math.floor(s.h1 * 3) }
  })
  const hull = useDerivedValue(() => HULLS[state.value.c % 3])
  return (
    <Group transform={transform} opacity={opacity}>
      <Path path={SHAPES.sail1} color="#fbfbf8" />
      <Path path={SHAPES.sail2} color="#efe9dc" />
      <Path path={SHAPES.hull} color={hull} />
    </Group>
  )
}

export function HotelsSkyActors({ time, box }) {
  const cfg = C.hotels.gulls
  const gull = (t, i) => {
    'worklet'
    const slotIndex = i >> 1, second = i & 1
    const s = slot(t, 14, slotIndex * 7, 3.3 + slotIndex * 4.1, cfg.flight - 1.5, cfg.flight + 1.5)
    const ltr = s.h3 < 0.5, show = second === 0 || s.h1 < 0.45
    const lag = second * 0.05, u = Math.min(Math.max(s.u - lag, 0), 1)
    const x0 = 440, x1 = 1080, y = 230 + 190 * s.h2 + second * 40
    const size = (11 + 4 * hash(i + s.k)) / 20
    return { x: ltr ? x0 + (x1 - x0) * u : x1 - (x1 - x0) * u, y: y - 30 * Math.sin(u * Math.PI) * 0.5, sx: size, sy: size,
      o: show && s.u >= 0 ? fadeOf(u, 0.03) : 0 }
  }
  return [0, 1, 2, 3].map((i) => <Bird key={i} time={time} box={box} i={i} colour="rgba(255,255,255,0.95)" scheduleFn={gull} flaps={cfg.flaps} />)
}
export function HotelsWaterActors({ time, box }) {
  return [0, 1].map((i) => <Boat key={i} time={time} box={box} seed={1.9 + i * 5} phase={i * 21 + 30} />)
}
export function HotelsTownActors({ time, box }) {
  return (
    <>
      {[0, 1, 2].map((i) => <Car key={`c${i}`} time={time} box={box} seed={4.4 + i * 3} phase={i * 3.75 + 8} />)}
      {[0, 1, 2, 3].map((i) => <Person key={`p${i}`} time={time} box={box} seed={7.7 + i * 2} phase={i * 9 + 30} />)}
    </>
  )
}

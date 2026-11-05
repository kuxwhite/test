import { SCENE_CONFIG as C } from './config.js'

/*
 * Small SVG actors that live inside the scenes: airliners and birds behind the
 * porthole; gulls, sailboats, cars and people in the hotel view. Each layer is
 * a DOM element masked to its area, so actors pass behind the frames. Motion
 * is Web Animations (compositor) and pauses together with the scene.
 * Positions are source pixels of the 1536×1024 picture, scaled by k to css px.
 */

const NS = 'http://www.w3.org/2000/svg'
const rand = (a, b) => a + Math.random() * (b - a)
const pick = (list) => list[Math.floor(Math.random() * list.length)]
let uid = 0

function svg(viewBox, width, height, inner) {
  const el = document.createElementNS(NS, 'svg')
  el.setAttribute('viewBox', viewBox)
  el.setAttribute('width', width)
  el.setAttribute('height', height)
  el.setAttribute('class', 'actor')
  el.innerHTML = inner
  return el
}

// Keyframes along a polyline of [x, y, scale] points (css px), fading in/out at
// the ends. Opacity has its own keyframes, so it works for 2-point paths too.
function along(points, flip, fade = 0.08) {
  const seg = points.slice(1).map((p, i) => Math.hypot(p[0] - points[i][0], p[1] - points[i][1]))
  const total = seg.reduce((a, b) => a + b, 0)
  let acc = 0
  const frames = points.map((p, i) => {
    if (i) acc += seg[i - 1]
    return { offset: total ? acc / total : i / (points.length - 1),
      transform: `translate(${p[0]}px, ${p[1]}px) scale(${flip ? -p[2] : p[2]}, ${p[2]})` }
  })
  frames[0].opacity = 0
  frames[frames.length - 1].opacity = 0
  frames.push({ offset: fade, opacity: 1 }, { offset: 1 - fade, opacity: 1 })
  return frames.sort((a, b) => a.offset - b.offset)
}

// ---------------------------------------------------------------- shapes
const airliner = () => {
  const id = `trail${uid++}`
  return svg('0 0 60 12', 44, 9, `
    <defs><linearGradient id="${id}" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/>
      <stop offset="1" stop-color="#fff" stop-opacity=".85"/></linearGradient></defs>
    <rect x="0" y="5.3" width="42" height="1.3" rx=".6" fill="url(#${id})"/>
    <path d="M41 6 L45.5 5 H56.5 Q59 6 56.5 7 H45.5 Z" fill="#fbfdff"/>
    <path d="M48.5 6 L52.5 1.2 H54 L52 6 Z" fill="#e9eff8"/>
    <path d="M48.5 6.2 L52.5 10.8 H54 L52 6.2 Z" fill="#dfe7f2"/>
    <path d="M44.5 5.2 L43.4 2.3 H44.9 L46.6 5.2 Z" fill="#e9eff8"/>`)
}
const wingbeat = (stroke) => svg('0 0 20 8', 0, 0, `<g class="actor-wings"><path d="M1 6 Q5 0.8 10 5 Q15 0.8 19 6"
  fill="none" stroke="${stroke}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></g>`)
const CAR_COLORS = ['#e2574c', '#f4f1ea', '#f2c14e', '#5b8bd9', '#7fb069', '#ffffff']
const car = () => {
  const c = pick(CAR_COLORS)
  return svg('0 0 14 7', 9, 4.5, `
    <path d="M3.4 2.7 L5 0.8 H9.4 L11 2.7 Z" fill="${c}"/>
    <path d="M5.4 1.3 H9.1 L10.1 2.6 H4.5 Z" fill="#d6ecf8"/>
    <rect x=".5" y="2.5" width="13" height="3" rx="1.2" fill="${c}"/>
    <rect x="1" y="3.3" width="12" height=".5" fill="#000" opacity=".08"/>
    <circle cx="3.6" cy="5.7" r="1.15" fill="#2f3640"/><circle cx="10.4" cy="5.7" r="1.15" fill="#2f3640"/>`)
}
const CLOTHES = ['#e85d75', '#3d7dd8', '#f2c14e', '#ffffff', '#5aa469', '#f08a4b']
const person = () => svg('0 0 4 10', 3.6, 9, `
  <circle cx="2" cy="1.4" r="1.25" fill="#e9b98f"/>
  <rect x=".7" y="2.9" width="2.6" height="4" rx="1.1" fill="${pick(CLOTHES)}"/>
  <path d="M1.5 6.6 V9.6 M2.5 6.6 V9.6" stroke="#3b4252" stroke-width=".8" stroke-linecap="round"/>`)
const sailboat = () => svg('0 0 12 13', 9, 9.75, `
  <path d="M6 .5 V9 H1.4 Z" fill="#fbfbf8"/><path d="M6.6 2 V9 H10.3 Z" fill="#efe9dc"/>
  <path d="M1 9.6 H11 L9.4 12 H2.6 Z" fill="${pick(['#c8553d', '#3d6fb4', '#ffffff'])}"/>`)

// ---------------------------------------------------------------- director
export class ActorDirector {
  constructor(scene, layers, k) {
    this.scene = scene      // 'flights' | 'hotels'
    this.layers = layers    // { name: element }
    this.k = k              // css px per source px
    this.anims = new Set()
    this.timers = new Map()
    this.running = false
    this.started = false
    this.count = { boats: 0 }
  }

  add(el, layer, anims) {
    const host = this.layers[layer]
    if (!host) { anims.forEach((a) => a.cancel()); return Promise.resolve() }
    host.appendChild(el)
    anims.forEach((a) => this.anims.add(a))
    return anims[0].finished.then(() => {
      anims.forEach((a) => { a.cancel(); this.anims.delete(a) })
      el.remove()
    }).catch(() => {})
  }

  // ----- flights
  spawnPlane() {
    const { k } = this, cfg = C.flights.planes
    const ltr = Math.random() < 0.5, el = airliner()
    const y = rand(...cfg.y) * k, s = rand(0.7, 1.05), x0 = 590 * k - 50, x1 = 940 * k + 10
    const pts = ltr ? [[x0, y, s], [x1, y - rand(4, 12), s]] : [[x1, y, s], [x0, y + rand(-6, 6), s]]
    this.add(el, 'glass', [el.animate(along(pts, !ltr, 0.04), { duration: rand(...cfg.cross) * 1000, easing: 'linear', fill: 'both' })])
  }

  spawnBirds() {
    const { k } = this, cfg = C.flights.birds
    const n = Math.round(rand(...cfg.flock)), ltr = Math.random() < 0.65, y = rand(...cfg.y) * k
    const dur = rand(...cfg.cross) * 1000, x0 = 600 * k - 20, x1 = 930 * k + 10
    for (let i = 0; i < n; i++) {
      const el = wingbeat('#3a4a60'), size = rand(7, 11)
      el.setAttribute('width', size); el.setAttribute('height', size * 0.4)
      const dy = (i % 2 ? 1 : -1) * Math.ceil(i / 2) * rand(3, 6), lag = i * rand(60, 160)
      const pts = ltr ? [[x0, y + dy, 1], [x1, y + dy - rand(6, 20), 1]] : [[x1, y + dy, 1], [x0, y + dy - rand(6, 20), 1]]
      const fly = el.animate(along(pts, !ltr, 0.03), { duration: dur, delay: lag, easing: 'linear', fill: 'both' })
      const flap = el.firstChild.animate([{ transform: 'scaleY(1)' }, { transform: 'scaleY(-0.4)' }],
        { duration: cfg.flaps * 1000 * rand(0.85, 1.15), iterations: Infinity, direction: 'alternate', easing: 'ease-in-out' })
      this.add(el, 'glass', [fly, flap])
    }
  }

  // ----- hotels
  spawnGulls() {
    const { k } = this, cfg = C.hotels.gulls
    const n = Math.random() < 0.45 ? 2 : 1, ltr = Math.random() < 0.5, y = rand(230, 420) * k
    for (let i = 0; i < n; i++) {
      const el = wingbeat('rgba(255,255,255,.95)'), size = rand(11, 15)
      el.setAttribute('width', size); el.setAttribute('height', size * 0.4)
      const x0 = 460 * k - 24, x1 = 1066 * k + 4, yy = y + i * rand(10, 18), dy = rand(-14, 6)
      const pts = ltr ? [[x0, yy, 1], [(x0 + x1) / 2, yy + dy * 0.6 - 4, 1], [x1, yy + dy, 1]]
        : [[x1, yy, 1], [(x0 + x1) / 2, yy + dy * 0.6 - 4, 1], [x0, yy + dy, 1]]
      const fly = el.animate(along(pts, false, 0.02), { duration: (cfg.flight + rand(-1.5, 1.5)) * 1000, delay: i * rand(250, 700), easing: 'linear', fill: 'both' })
      const flap = el.firstChild.animate([{ transform: 'scaleY(1)' }, { transform: 'scaleY(-0.35)' }],
        { duration: cfg.flaps * 1000, iterations: Infinity, direction: 'alternate', easing: 'ease-in-out' })
      this.add(el, 'sky', [fly, flap])
    }
  }

  spawnBoat() {
    const { k } = this, cfg = C.hotels.boats
    if (this.count.boats >= cfg.max) return
    this.count.boats++
    const el = sailboat(), ltr = Math.random() < 0.5
    const y = rand(570, 640), s = 0.55 + ((y - 570) / 70) * 0.5 // nearer = lower = bigger
    const x0 = 470 * k - 6, x1 = 860 * k
    const pts = ltr ? [[x0, y * k, s], [x1, y * k + 2, s]] : [[x1, y * k, s], [x0, y * k + 2, s]]
    const sail = el.animate(along(pts, !ltr, 0.06), { duration: rand(...cfg.cross) * 1000, easing: 'linear', fill: 'both' })
    const bob = el.animate([{ rotate: '-3deg' }, { rotate: '3deg' }], { duration: 1600, iterations: Infinity, direction: 'alternate', easing: 'ease-in-out' })
    this.add(el, 'water', [sail, bob]).then(() => { this.count.boats = Math.max(0, this.count.boats - 1) })
  }

  spawnCar() {
    const { k } = this, cfg = C.hotels.cars
    // the coast road at the foot of the hill, rising into the distance
    const road = [[690, 616, 1], [760, 603, 0.94], [830, 590, 0.86], [900, 575, 0.78], [960, 562, 0.7], [1012, 551, 0.64]]
    const pts = road.map(([x, y, s]) => [x * k, y * k - 4.5, s]) // wheels on the road
    const away = Math.random() < 0.5
    const el = car()
    this.add(el, 'town', [el.animate(along(away ? pts : pts.slice().reverse(), !away, 0.07),
      { duration: rand(...cfg.cross) * 1000, easing: 'linear', fill: 'both' })])
  }

  spawnPerson() {
    const { k } = this, cfg = C.hotels.people
    // along the shore, where the sea meets the greenery
    const shore = [[478, 666, 1], [560, 667, 1], [640, 664, 0.97], [712, 655, 0.92]]
    const pts = shore.map(([x, y, s]) => [x * k, y * k - 9, s]) // feet on the shore line (figure is 9 px tall)
    const right = Math.random() < 0.5
    const el = person()
    const walk = el.animate(along(right ? pts : pts.slice().reverse(), false, 0.06), { duration: rand(...cfg.cross) * 1000, easing: 'linear', fill: 'both' })
    const step = el.animate([{ translate: '0 0' }, { translate: '0 -0.5px' }], { duration: 260, iterations: Infinity, direction: 'alternate' })
    this.add(el, 'town', [walk, step])
  }

  // ----- scheduling
  get plan() {
    return this.scene === 'flights'
      ? [['plane', C.flights.planes.every, () => this.spawnPlane()], ['birds', C.flights.birds.every, () => this.spawnBirds()]]
      : [['gulls', C.hotels.gulls.every, () => this.spawnGulls()], ['boat', C.hotels.boats.every, () => this.spawnBoat()],
         ['car', C.hotels.cars.every, () => this.spawnCar()], ['person', C.hotels.people.every, () => this.spawnPerson()]]
  }

  schedule(name, every, spawn, first) {
    this.timers.set(name, setTimeout(() => {
      if (!this.running) return
      spawn()
      this.schedule(name, every, spawn)
    }, first ?? rand(...every) * 1000))
  }

  start() {
    if (this.running) return
    this.running = true
    this.anims.forEach((a) => a.play())
    const firstRun = !this.started
    this.started = true
    // on first show, bring the scene to life at once: actors start soon, staggered
    this.plan.forEach(([name, every, spawn], i) => this.schedule(name, every, spawn, firstRun ? 300 + i * 700 : undefined))
    if (firstRun && this.scene === 'hotels') { this.spawnBoat(); this.spawnPerson() }
  }

  stop() {
    this.running = false
    this.timers.forEach((t) => clearTimeout(t))
    this.timers.clear()
    this.anims.forEach((a) => a.pause())
  }

  destroy() {
    this.stop()
    this.anims.forEach((a) => a.cancel())
    Object.values(this.layers).forEach((l) => l && l.replaceChildren())
  }
}

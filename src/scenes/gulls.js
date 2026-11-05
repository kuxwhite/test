import { SCENE_CONFIG as C } from './config.js'

// 1–2 gulls cross the hotel sky every 8–12 s. Small SVG silhouettes, white like
// the gulls painted in the picture, flapping as they glide. The layer is masked
// to the sky, so the birds pass behind the window frame.
const SVG_NS = 'http://www.w3.org/2000/svg'
const rand = (a, b) => a + Math.random() * (b - a)

export class GullFlock {
  constructor(layer, k) {
    this.layer = layer
    this.k = k // css px per source px
    this.anims = new Set()
    this.timer = 0
    this.running = false
  }

  makeGull(size) {
    const svg = document.createElementNS(SVG_NS, 'svg')
    svg.setAttribute('viewBox', '0 0 20 8')
    svg.setAttribute('width', size)
    svg.setAttribute('height', size * 0.4)
    svg.classList.add('gull')
    const g = document.createElementNS(SVG_NS, 'g')
    const path = document.createElementNS(SVG_NS, 'path')
    path.setAttribute('d', 'M1 6 Q5 0.8 10 5 Q15 0.8 19 6')
    g.appendChild(path)
    svg.appendChild(g)
    return { svg, wings: g }
  }

  spawn() {
    const { k } = this, cfg = C.hotels.gulls
    const count = Math.random() < 0.45 ? 2 : 1
    const leftToRight = Math.random() < 0.5
    const baseY = rand(230, 400) * k
    for (let i = 0; i < count; i++) {
      const size = rand(11, 15)
      const { svg, wings } = this.makeGull(size)
      this.layer.appendChild(svg)
      const x0 = 460 * k - 24, x1 = 1066 * k + 4
      const y = baseY + i * rand(10, 18), dy = rand(-14, 6)
      const [from, to] = leftToRight ? [x0, x1] : [x1, x0]
      const flight = svg.animate([
        { transform: `translate(${from}px, ${y}px)` },
        { transform: `translate(${(from + to) / 2}px, ${y + dy * 0.6 - 4}px)` },
        { transform: `translate(${to}px, ${y + dy}px)` },
      ], { duration: (cfg.flight + rand(-1.5, 1.5)) * 1000, delay: i * rand(250, 700), easing: 'linear', fill: 'both' })
      const flap = wings.animate([{ transform: 'scaleY(1)' }, { transform: 'scaleY(-0.35)' }],
        { duration: cfg.flaps * 1000, iterations: Infinity, direction: 'alternate', easing: 'ease-in-out' })
      this.anims.add(flight)
      this.anims.add(flap)
      flight.finished.then(() => {
        flap.cancel()
        this.anims.delete(flight)
        this.anims.delete(flap)
        svg.remove()
      }).catch(() => {})
    }
  }

  schedule() {
    const [a, b] = C.hotels.gulls.every
    this.timer = setTimeout(() => {
      if (!this.running) return
      this.spawn()
      this.schedule()
    }, rand(a, b) * 1000)
  }

  start() {
    if (this.running) return
    this.running = true
    this.anims.forEach((a) => a.play())
    if (!this.started) { // the first gulls come soon after the scene appears
      this.started = true
      this.timer = setTimeout(() => { if (this.running) { this.spawn(); this.schedule() } }, 1200)
    } else this.schedule()
  }

  stop() {
    this.running = false
    clearTimeout(this.timer)
    this.anims.forEach((a) => a.pause())
  }

  destroy() {
    this.stop()
    this.anims.forEach((a) => a.cancel())
    this.layer.replaceChildren()
  }
}

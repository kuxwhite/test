import { SCENE_CONFIG as C } from './config.js'
import { FLIGHTS, HOTELS, VERTEX } from './shaders.js'

/*
 * One WebGL2 canvas per scene. The illustration is one texture; masks and
 * cloud strips are small helper textures. Per frame only uniforms change —
 * no React state. The clock advances only while the scene is running, so a
 * paused scene resumes exactly where it stopped.
 */

const BASE = import.meta.env.BASE_URL
const DEG = Math.PI / 180

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const im = new Image()
    im.decoding = 'async'
    im.onload = () => resolve(im)
    im.onerror = () => reject(new Error('image failed: ' + url))
    im.src = url
  })
}

function compile(gl, type, src) {
  const sh = gl.createShader(type)
  gl.shaderSource(sh, src)
  gl.compileShader(sh)
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh))
  return sh
}

export function webgl2Available() {
  try { return !!document.createElement('canvas').getContext('webgl2') } catch { return false }
}

export class LiveScene {
  constructor(canvas, id, { cssHeight }) {
    this.canvas = canvas
    this.id = id
    this.srcPerCss = 1024 / cssHeight
    this.time = 0
    this.running = false
    this.reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    this.par = [0, 0]
    this.raf = 0
    this.last = 0
    this.ready = this.init()
  }

  async init() {
    const gl = this.canvas.getContext('webgl2', { alpha: false, antialias: false, premultipliedAlpha: false, powerPreference: 'low-power' })
    if (!gl) throw new Error('no webgl2')
    this.gl = gl
    const prog = gl.createProgram()
    gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERTEX))
    gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, this.id === 'flights' ? FLIGHTS : HOTELS))
    gl.linkProgram(prog)
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog))
    gl.useProgram(prog)
    this.prog = prog

    const buf = gl.createBuffer() // one big triangle covers the canvas
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    const loc = gl.getAttribLocation(prog, 'a_pos')
    gl.enableVertexAttribArray(loc)
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)

    const textures = this.id === 'flights'
      ? { u_img: 'scenes/flights.png', u_mask: 'scenes/masks/flights-pack-a.png',
          u_far: ['scenes/masks/flights-tile-far.png', true], u_mid: ['scenes/masks/flights-tile-mid.png', true] }
      : { u_img: 'scenes/hotels.png', u_maskA: 'scenes/masks/hotels-pack-a.png', u_maskB: 'scenes/masks/hotels-pack-b.png' }
    const entries = Object.entries(textures)
    const images = await Promise.all(entries.map(([, v]) => loadImage(BASE + (Array.isArray(v) ? v[0] : v))))
    if (this.destroyed) return // unmounted while loading (StrictMode remount shares the context)
    gl.useProgram(prog)
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false)
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false)
    this.sizes = {}
    entries.forEach(([name, v], unit) => {
      const repeat = Array.isArray(v) && v[1]
      const tex = gl.createTexture()
      gl.activeTexture(gl.TEXTURE0 + unit)
      gl.bindTexture(gl.TEXTURE_2D, tex)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, images[unit])
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, repeat ? gl.REPEAT : gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
      gl.uniform1i(gl.getUniformLocation(prog, name), unit)
      this.sizes[name] = [images[unit].naturalWidth, images[unit].naturalHeight]
    })
    this.u = (name) => gl.getUniformLocation(prog, name)
    this.setStaticUniforms()
    this.loaded = true
    this.resize()
    this.draw()
  }

  setStaticUniforms() {
    const gl = this.gl, u = this.u, s = this.srcPerCss
    if (this.id === 'flights') {
      const f = C.flights, glassW = 308, dir = f.direction
      gl.uniform2fv(u('u_farSize'), this.sizes.u_far)
      gl.uniform2fv(u('u_midSize'), this.sizes.u_mid)
      gl.uniform3f(u('u_speed'), dir * glassW / f.clouds.far.secondsPerWindow,
        dir * glassW / f.clouds.mid.secondsPerWindow, dir * glassW / f.clouds.near.secondsPerWindow)
      gl.uniform4f(u('u_cloud'), f.clouds.horizon, f.clouds.mid.scale, f.clouds.near.opacity, f.clouds.near.size)
      gl.uniform3f(u('u_sway'), f.sway.amp * s, f.sway.period, f.sway.horizonTilt * DEG)
      gl.uniform4f(u('u_turb'), f.turbulence.every, f.turbulence.jitter, f.turbulence.duration, f.turbulence.amp * s)
      gl.uniform4f(u('u_rays'), ...f.rays.origin, f.rays.intensity, f.rays.period)
      gl.uniform3f(u('u_glint'), f.glint.every, f.glint.duration, f.glint.intensity)
      gl.uniform4f(u('u_spot'), ...f.spot.center, f.spot.radius, f.spot.intensity)
    } else {
      const h = C.hotels, cs = h.casements
      gl.uniform2f(u('u_wind'), h.wind.speed, h.wind.gust)
      gl.uniform1f(u('u_windScale'), this.reduced ? C.reduced.windScale : 1)
      gl.uniform4f(u('u_caseL'), cs.left.hinge, cs.left.width, cs.left.centerY, 0)
      gl.uniform4f(u('u_caseR'), cs.right.hinge, cs.right.width, cs.right.centerY, 0)
      gl.uniform2f(u('u_case'), cs.maxDeg * DEG, cs.lag)
      gl.uniform4f(u('u_curtain'), h.curtain.length, h.curtain.amp, h.curtain.wave, h.curtain.speed)
      gl.uniform2f(u('u_curtain2'), h.curtain.billow, h.curtain.centerX)
      gl.uniform3f(u('u_plant'), ...h.plant.pivot, h.plant.maxDeg * DEG)
      gl.uniform2f(u('u_sky'), h.sky.drift, h.sky.period)
      gl.uniform2f(u('u_water'), h.water.ripple, h.water.sparkle)
    }
    gl.uniform1f(u('u_still'), this.reduced ? 1 : 0)
  }

  resize() {
    if (!this.loaded) return
    const dpr = Math.min(window.devicePixelRatio || 1, C.dprMax)
    const w = Math.round(this.canvas.clientWidth * dpr), h = Math.round(this.canvas.clientHeight * dpr)
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w
      this.canvas.height = h
      this.gl.viewport(0, 0, w, h)
    }
  }

  // tilt parallax in css px
  setParallax(x, y) {
    this.par = [x * this.srcPerCss, y * this.srcPerCss]
    if (!this.running) this.draw()
  }

  draw() {
    const gl = this.gl
    if (!this.loaded || this.destroyed) return
    gl.useProgram(this.prog)
    gl.uniform2f(this.u('u_res'), this.canvas.width, this.canvas.height)
    gl.uniform1f(this.u('u_time'), this.time)
    gl.uniform2f(this.u('u_par'), this.par[0], this.par[1])
    gl.drawArrays(gl.TRIANGLES, 0, 3)
  }

  // reduced motion: flights is fully still; hotels keeps a very slow sway
  get animates() { return !(this.reduced && this.id === 'flights') }

  start() {
    if (this.running || this.destroyed || !this.animates) return
    this.running = true
    this.last = 0
    const tick = (now) => {
      if (!this.running) return
      const dt = this.last ? Math.min((now - this.last) / 1000, 0.1) : 0
      this.last = now
      this.time += dt * (this.reduced ? C.reduced.timeScale : 1)
      this.draw()
      this.raf = requestAnimationFrame(tick)
    }
    this.raf = requestAnimationFrame(tick)
  }

  stop() {
    this.running = false
    cancelAnimationFrame(this.raf)
  }

  // The canvas (and its context) belongs to React; a remount reuses it, so the
  // context is not lost here — the browser frees it with the canvas.
  destroy() {
    this.stop()
    this.destroyed = true
  }
}

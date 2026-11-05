// Masks and loop textures for the living scenes (cinemagraph shader).
//
//   node tools/make-masks.mjs
//
// Reads public/scenes/{flights,hotels}.png (1536×1024, never modified) and writes
//   public/scenes/masks/<scene>-<area>.png      one black/white mask per moving area
//   public/scenes/masks/<scene>-pack-*.png      the same masks packed into RGB for the shader
//   public/scenes/masks/flights-tile-*.png      seamless cloud strips cut from the glass
//   reference/masks-preview-<scene>.png         picture + masks in translucent colour
// All coordinates are source pixels, measured on the illustrations.
import sharp from 'sharp'
import fs from 'node:fs/promises'

const W = 1536, H = 1024
const SRC = 'public/scenes', OUT = 'public/scenes/masks', REF = 'reference'

// ---------------------------------------------------------------- helpers
const blank = () => new Uint8Array(W * H)

function fillPolygon(mask, pts, value = 255) {
  for (let y = 0; y < H; y++) {
    const cy = y + 0.5, xs = []
    for (let i = 0; i < pts.length; i++) {
      const [x1, y1] = pts[i], [x2, y2] = pts[(i + 1) % pts.length]
      if ((y1 <= cy && y2 > cy) || (y2 <= cy && y1 > cy)) xs.push(x1 + ((cy - y1) / (y2 - y1)) * (x2 - x1))
    }
    xs.sort((a, b) => a - b)
    for (let i = 0; i + 1 < xs.length; i += 2) {
      for (let x = Math.max(0, Math.ceil(xs[i] - 0.5)); x < Math.min(W, Math.floor(xs[i + 1] + 0.5)); x++) mask[y * W + x] = value
    }
  }
  return mask
}

function roundedRect(x0, y0, x1, y1, [trx, tr], [brx, br], steps = 32) {
  const pts = []
  const arc = (cx, cy, rx, ry, a0, a1) => {
    for (let i = 0; i <= steps; i++) {
      const a = ((a0 + ((a1 - a0) * i) / steps) * Math.PI) / 180
      pts.push([cx + rx * Math.cos(a), cy + ry * Math.sin(a)])
    }
  }
  arc(x1 - trx, y0 + tr, trx, tr, -90, 0)
  arc(x1 - brx, y1 - br, brx, br, 0, 90)
  arc(x0 + brx, y1 - br, brx, br, 90, 180)
  arc(x0 + trx, y0 + tr, trx, tr, 180, 270)
  return pts
}

const raw1 = (buf) => sharp(Buffer.from(buf), { raw: { width: W, height: H, channels: 1 } })
async function blur(mask, sigma) {
  if (!sigma) return mask
  return new Uint8Array(await raw1(mask).blur(sigma).extractChannel(0).raw().toBuffer())
}
async function dilate(mask, r) { // grow the shape by ~r px
  const b = await blur(mask, r / 2)
  return b.map((v) => (v > 8 ? 255 : 0))
}
const mul = (a, b) => a.map((v, i) => Math.round((v * b[i]) / 255))
const sub = (a, b) => a.map((v, i) => Math.max(0, v - b[i]))
function rampY(y0, y1) { // 0 above y0 → 255 below y1
  const m = blank()
  for (let y = 0; y < H; y++) {
    const v = Math.round(255 * Math.min(1, Math.max(0, (y - y0) / (y1 - y0))))
    m.fill(v, y * W, (y + 1) * W)
  }
  return m
}
async function readRGB(name) {
  return new Uint8Array(await sharp(`${SRC}/${name}.png`).removeAlpha().raw().toBuffer())
}
const save1 = (mask, path) => raw1(mask).toColourspace('b-w').png({ compressionLevel: 9 }).toFile(path)
function pack3(r, g, b) {
  const out = new Uint8Array(W * H * 3)
  for (let i = 0; i < W * H; i++) { out[i * 3] = r[i]; out[i * 3 + 1] = g[i]; out[i * 3 + 2] = b[i] }
  return sharp(Buffer.from(out), { raw: { width: W, height: H, channels: 3 } }).png({ compressionLevel: 9 })
}

// White + alpha copy of a mask, for CSS masks of the DOM actor layers.
async function saveAlpha(mask, path) {
  const rgba = new Uint8Array(W * H * 4)
  for (let i = 0; i < W * H; i++) { rgba[i * 4] = rgba[i * 4 + 1] = rgba[i * 4 + 2] = 255; rgba[i * 4 + 3] = mask[i] }
  await sharp(Buffer.from(rgba), { raw: { width: W, height: H, channels: 4 } }).resize(768, 512).png({ compressionLevel: 9 }).toFile(path)
}

async function preview(scene, layers, path) {
  const img = await readRGB(scene)
  const out = new Uint8Array(img)
  for (const { mask, color } of layers) {
    for (let i = 0; i < W * H; i++) {
      const a = (mask[i] / 255) * 0.5
      if (!a) continue
      for (let c = 0; c < 3; c++) out[i * 3 + c] = Math.round(out[i * 3 + c] * (1 - a) + color[c] * a)
    }
  }
  const legend = layers.map((l, i) =>
    `<rect x="24" y="${24 + i * 34}" width="22" height="22" rx="4" fill="rgb(${l.color})"/>` +
    `<text x="56" y="${42 + i * 34}" font-family="sans-serif" font-size="20" fill="#111">${l.name}</text>`).join('')
  const svg = Buffer.from(`<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    <rect x="12" y="12" width="300" height="${layers.length * 34 + 20}" rx="10" fill="rgba(255,255,255,.85)"/>${legend}</svg>`)
  await sharp(Buffer.from(out), { raw: { width: W, height: H, channels: 3 } })
    .composite([{ input: svg }]).png().toFile(path)
}

// Seamless horizontal strip: crop, then crossfade the right end into the left end.
async function seamlessTile(scene, [x, y, w, h], overlap, path) {
  const src = new Uint8Array(await sharp(`${SRC}/${scene}.png`).removeAlpha()
    .extract({ left: x, top: y, width: w, height: h }).raw().toBuffer())
  const tw = w - overlap, out = new Uint8Array(tw * h * 3)
  for (let yy = 0; yy < h; yy++) {
    for (let xx = 0; xx < tw; xx++) {
      const a = xx < overlap ? xx / overlap : 1
      for (let c = 0; c < 3; c++) {
        const near = src[(yy * w + xx) * 3 + c]
        const far = xx < overlap ? src[(yy * w + tw + xx) * 3 + c] : near
        out[(yy * tw + xx) * 3 + c] = Math.round(far * (1 - a) + near * a)
      }
    }
  }
  await sharp(Buffer.from(out), { raw: { width: tw, height: h, channels: 3 } }).png().toFile(path)
  return { width: tw, height: h }
}

await fs.mkdir(OUT, { recursive: true })

// ---------------------------------------------------------------- flights
// Glass of the porthole: x 612–920, y 366–830, elliptical corners (measured).
const glassHard = fillPolygon(blank(), roundedRect(612, 366, 920, 830, [125, 150], [115, 135]))
const glass = await blur(glassHard, 2) // the frame edge stays crisp
// Cloud field below the horizon (y ≈ 578), feathered so the sky above stays put.
const clouds = mul(glass, await blur(rampY(572, 590), 4))
await save1(glass, `${OUT}/flights-glass.png`)
await save1(clouds, `${OUT}/flights-clouds.png`)
await pack3(glass, clouds, blank()).toFile(`${OUT}/flights-pack-a.png`)
await saveAlpha(glassHard, `${OUT}/flights-glass-alpha.png`) // planes and birds fly behind the frame
// Loop textures from frame-free bands of the glass: far = fine clouds at the
// horizon, mid = bigger clouds lower down. The near wisps are procedural.
const far = await seamlessTile('flights', [616, 578, 300, 72], 60, `${OUT}/flights-tile-far.png`)
const mid = await seamlessTile('flights', [655, 640, 225, 160], 70, `${OUT}/flights-tile-mid.png`)
await preview('flights', [
  { name: 'glass (view, sway)', mask: glass, color: [40, 120, 255] },
  { name: 'clouds (3 layers)', mask: clouds, color: [255, 60, 160] },
], `${REF}/masks-preview-flights.png`)

// ---------------------------------------------------------------- hotels
const hotelsRGB = await readRGB('hotels')
// The view through the opening: x 474–1056, y 186–784, rounded top (measured),
// inset from the frame so the frame never moves.
const viewHard = fillPolygon(blank(), roundedRect(474, 190, 1052, 780, [66, 66], [40, 40]))
// Plant on the sill (foliage only — the pot stays): pivot at the rim (512, 772).
const plantHard = fillPolygon(blank(), [[436, 705], [452, 662], [490, 640], [545, 638], [592, 655], [604, 705],
  [596, 760], [560, 778], [470, 780], [440, 760]])
const plant = await blur(await dilate(plantHard, 10), 6)
const view = await blur(sub(viewHard, await dilate(plantHard, 18)), 6)
// Sky: above the mountains (y < ~485).
const sky = mul(view, await blur(sub(rampY(0, 1), rampY(450, 490)), 4))
// Sea: blue pixels between the horizon and the coast.
const waterHard = blank()
for (let y = 540; y < 668; y++) for (let x = 457; x < 905; x++) {
  const i = y * W + x, r = hotelsRGB[i * 3], g = hotelsRGB[i * 3 + 1], b = hotelsRGB[i * 3 + 2]
  if (b > 140 && b - r > 70 && b > g) waterHard[i] = 255
}
const water = mul(view, await blur(waterHard, 3))
// Casements: quads measured on the picture, hinges on the outer side.
const shutterL = fillPolygon(blank(), [[318, 160], [462, 197], [462, 794], [318, 832]]) // right one added below
const shutters = await blur(await dilate(fillPolygon(shutterL, [[1074, 212], [1209, 165], [1209, 829], [1074, 784]]), 6), 4)
// Curtain: the whole tulle as one shape (outline measured on the picture), kept
// right of the casement frame (x ≥ 1212) so the frame never moves.
const curtainShape = fillPolygon(blank(), [[1290, 0], [1520, 0], [1505, 300], [1478, 560], [1430, 760], [1405, 862],
  [1330, 830], [1250, 780], [1165, 738], [1235, 610], [1292, 430], [1300, 220]])
const awayFromFrame = blank()
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) awayFromFrame[y * W + x] = Math.round(255 * Math.min(1, Math.max(0, (x - 1212) / 26)))
const curtain = mul(await blur(await dilate(curtainShape, 14), 10), awayFromFrame)
for (const [n, m] of Object.entries({ view, sky, water, shutters, curtain, plant })) await save1(m, `${OUT}/hotels-${n}.png`)
await pack3(view, sky, water).toFile(`${OUT}/hotels-pack-a.png`)
// Alpha copies for the DOM actors: gulls in the sky, boats on the sea, cars and people in the view.
await saveAlpha(sky, `${OUT}/hotels-sky-alpha.png`)
await saveAlpha(water, `${OUT}/hotels-water-alpha.png`)
await saveAlpha(view, `${OUT}/hotels-view-alpha.png`)
// Trees and bushes in the town: green pixels in the view below the mountains.
const treesHard = blank()
for (let y = 470; y < 790; y++) for (let x = 470; x < 1060; x++) {
  const i = y * W + x, r = hotelsRGB[i * 3], g = hotelsRGB[i * 3 + 1], b = hotelsRGB[i * 3 + 2]
  if (g > r + 18 && g > b + 8 && g > 70) treesHard[i] = 255
}
const trees = mul(sub(await blur(await dilate(treesHard, 4), 3), await dilate(plantHard, 18)), view)
await save1(trees, `${OUT}/hotels-trees.png`)
await pack3(trees, blank(), blank()).toFile(`${OUT}/hotels-pack-c.png`)
await pack3(shutters, curtain, plant).toFile(`${OUT}/hotels-pack-b.png`)
await preview('hotels', [
  { name: 'view (parallax)', mask: view, color: [40, 120, 255] },
  { name: 'sky (clouds drift)', mask: sky, color: [0, 200, 255] },
  { name: 'water (shimmer)', mask: water, color: [0, 230, 120] },
  { name: 'casements (hinges)', mask: shutters, color: [255, 150, 0] },
  { name: 'curtain (cloth wave)', mask: curtain, color: [255, 50, 160] },
  { name: 'plant (sway)', mask: plant, color: [150, 60, 255] },
  { name: 'trees (wind)', mask: trees, color: [255, 230, 0] },
], `${REF}/masks-preview-hotels.png`)

console.log('tiles', { far, mid })

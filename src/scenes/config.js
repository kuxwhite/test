// Everything that moves in the header lives here. Tweak freely.
// Units: seconds, degrees; distances in SOURCE pixels of the 1536×1024
// illustrations unless marked "css px" (1 css px ≈ 2.9 source px in the header).

export const SCENE_CONFIG = {
  dprMax: 2,

  // Phone tilt / finger parallax of the view, on top of the living scene.
  tilt: { amp: 4 }, // ± css px

  flights: {
    // Nose is on the left (the seat on the right shows its cushioned front facing
    // left), so the clouds travel left → right.
    direction: 1,
    clouds: {
      horizon: 578,                                 // y of the horizon in the glass
      far: { secondsPerWindow: 28 },                // fine clouds at the horizon
      mid: { secondsPerWindow: 13, scale: 1.44 },   // bigger clouds lower down
      near: { secondsPerWindow: 6, opacity: 0.38, size: 0.011 }, // procedural wisps rushing past
    },
    sway: { amp: 2, period: 7, horizonTilt: 0.6 },  // amp in css px
    turbulence: { every: 20, jitter: 5, duration: 0.6, amp: 1.6 }, // every 15–25 s; amp in css px
    rays: { origin: [650, 395], intensity: 0.16, period: 9 },      // god rays from the top corner of the glass
    glint: { every: 12, duration: 1.4, intensity: 0.22 },          // diagonal glint over the glass
    spot: { center: [520, 880], radius: 230, intensity: 0.12 },    // warm patch on the cabin wall
  },

  hotels: {
    wind: { speed: 0.35, gust: 0.9 },               // one shared gust(t) drives casements, curtain, plant
    casements: {
      left: { hinge: 322, width: 140, centerY: 496 },
      right: { hinge: 1207, width: 133, centerY: 497 },
      maxDeg: 4,
      lag: 0.7,                                     // s: the right casement follows the left one
    },
    curtain: { length: 860, amp: 22, wave: 240, speed: 1.6, billow: 0.05, centerX: 1400 },
    plant: { pivot: [512, 772], maxDeg: 1.8 },
    sky: { drift: 18, period: 48 },                 // clouds drift back and forth (± px, s)
    water: { ripple: 1.1, sparkle: 0.55 },
    gulls: { every: [8, 12], flight: 9, flaps: 0.32 }, // seconds
  },

  // prefers-reduced-motion: clouds, gulls, rays and glint stop; only a very slow
  // sway of the curtain and casements remains.
  reduced: { windScale: 0.35, timeScale: 0.35 },
}

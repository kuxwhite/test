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
      far: { secondsPerWindow: 16 },                // fine clouds at the horizon
      mid: { secondsPerWindow: 7, scale: 1.44 },    // bigger clouds lower down
      near: { secondsPerWindow: 3.2, opacity: 0.5, size: 0.011 }, // procedural wisps rushing past
    },
    sway: { amp: 3, period: 7, horizonTilt: 0.9 },  // amp in css px
    turbulence: { every: 20, jitter: 5, duration: 0.6, amp: 1.6 }, // every 15–25 s; amp in css px
    rays: { origin: [650, 395], intensity: 0.2, period: 9 },      // god rays from the top corner of the glass
    glint: { every: 12, duration: 1.4, intensity: 0.22 },          // diagonal glint over the glass
    spot: { center: [520, 880], radius: 230, intensity: 0.12 },    // warm patch on the cabin wall
    // Actors behind the glass (SVG, masked to the glass). Times in seconds.
    planes: { every: [7, 12], cross: [7, 10], y: [400, 560] },      // other airliners with contrails
    birds: { every: [5, 9], cross: [3, 4.5], flock: [3, 5], y: [470, 760], flaps: 0.18 },
  },

  hotels: {
    wind: { speed: 0.35, gust: 0.9 },               // one shared gust(t) drives casements, curtain, plant
    casements: {
      left: { hinge: 322, width: 140, centerY: 496 },
      right: { hinge: 1207, width: 133, centerY: 497 },
      maxDeg: 7,
      lag: 0.7,                                     // s: the right casement follows the left one
    },
    curtain: { length: 860, amp: 34, wave: 240, speed: 1.6, billow: 0.05, centerX: 1400 },
    plant: { pivot: [512, 772], maxDeg: 3 },
    trees: { amp: 4, flutter: 0.9 },                // town greenery: sway (± px) and flutter speed
    sky: { drift: 38, period: 36 },                 // clouds drift back and forth (± px, s)
    water: { ripple: 2, sparkle: 0.9 },
    // Actors in the view (SVG, masked to their area). Times in seconds.
    gulls: { every: [5, 9], flight: 9, flaps: 0.32 },
    boats: { every: [6, 12], cross: [28, 40], max: 2 },               // sailboats on the sea
    cars: { every: [2.5, 5], cross: [7, 10] },                        // on the coast road
    people: { every: [2, 4], cross: [25, 35] },                       // walking along the shore
  },

  // prefers-reduced-motion: clouds, gulls, rays and glint stop; only a very slow
  // sway of the curtain and casements remains.
  reduced: { windScale: 0.35, timeScale: 0.35 },
}

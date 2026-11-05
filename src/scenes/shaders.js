// Fragment shaders for the living scenes (WebGL2 / GLSL ES 3.0).
// The shader only re-samples the illustration inside the masks: UV shifts
// (scroll, wave, sway) plus a little light. Coordinates are source pixels.

export const VERTEX = `#version 300 es
in vec2 a_pos;
void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
`

const COMMON = `#version 300 es
precision highp float;
out vec4 outColor;
uniform vec2 u_res;      // canvas size in device px
uniform float u_time;    // s, only advances while the scene runs
uniform vec2 u_par;      // tilt parallax, source px
uniform sampler2D u_img;
const vec2 SIZE = vec2(1536.0, 1024.0);
const float TAU = 6.28318530718;

vec2 srcPos() { return vec2(gl_FragCoord.x, u_res.y - gl_FragCoord.y) / u_res * SIZE; }
vec3 img(vec2 p) { return texture(u_img, clamp(p, vec2(0.5), SIZE - 0.5) / SIZE).rgb; }
mat2 rot(float a) { float c = cos(a), s = sin(a); return mat2(c, s, -s, c); }
float hash1(float n) { return fract(sin(n) * 43758.5453123); }
float hash2(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
float noise1(float x) { float i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f); return mix(hash1(i), hash1(i + 1.0), f); }
float noise2(vec2 p) {
  vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash2(i), hash2(i + vec2(1, 0)), f.x), mix(hash2(i + vec2(0, 1)), hash2(i + vec2(1, 1)), f.x), f.y);
}
float fbm(vec2 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { v += a * noise2(p); p = p * 2.03 + 17.0; a *= 0.5; } return v; }
vec3 screenBlend(vec3 base, vec3 light) { return 1.0 - (1.0 - base) * (1.0 - light); }
`

export const FLIGHTS = COMMON + `
uniform sampler2D u_mask;      // R glass, G cloud field
uniform sampler2D u_far, u_mid; // seamless cloud strips (repeat in x)
uniform vec2 u_farSize, u_midSize;
uniform vec3 u_speed;          // far, mid, near: source px per second (signed: + = to the right)
uniform vec4 u_cloud;          // horizon, mid scale, near opacity, near size
uniform vec3 u_sway;           // amp (src px), period, horizon tilt (rad)
uniform vec4 u_turb;           // every, jitter, duration, amp (src px)
uniform vec4 u_rays;           // origin.xy, intensity, period
uniform vec3 u_glint;          // every, duration, intensity
uniform vec4 u_spot;           // center.xy, radius, intensity
uniform float u_still;         // 1 = reduced motion: no light effects

const vec2 GLASS_C = vec2(766.0, 598.0);

vec2 turbulence(float t) {
  float k = floor(t / u_turb.x);
  float start = k * u_turb.x + (hash1(k * 7.13) - 0.5) * 2.0 * u_turb.y + u_turb.x * 0.5;
  float u = (t - start) / u_turb.z;
  if (u < 0.0 || u > 1.0) return vec2(0.0);
  float env = sin(3.14159 * u);
  return env * u_turb.w * (vec2(noise1(t * 28.0), noise1(t * 31.0 + 9.0)) - 0.5) * 2.0;
}

void main() {
  vec2 p = srcPos();
  vec3 base = img(p);
  float glass = texture(u_mask, p / SIZE).r;
  float t = u_time;
  vec3 col = base;

  if (glass > 0.002) {
    // the plane gently rocks: vertical float, horizon tilt, rare turbulence
    float bob = sin(t * TAU / u_sway.y) * u_sway.x;
    float ang = u_sway.z * sin(t * TAU / (u_sway.y * 1.37) + 1.3);
    vec2 q = rot(-ang) * (p - GLASS_C);
    q -= vec2(0.0, bob) + turbulence(t) + u_par;
    vec2 v = GLASS_C + q / 1.06;          // a little zoom gives slack at the edges
    vec3 view = img(v);                   // sky as painted

    float horizon = u_cloud.x;
    vec2 farUV = vec2((v.x - u_speed.x * t) / u_farSize.x, clamp((v.y - horizon) / u_farSize.y, 0.01, 0.99));
    vec2 midUV = vec2((v.x - u_speed.y * t) / (u_midSize.x * u_cloud.y),
                      clamp((v.y - (horizon + 22.0)) / (u_midSize.y * u_cloud.y), 0.01, 0.99));
    vec3 farC = texture(u_far, farUV).rgb;
    vec3 midC = texture(u_mid, midUV).rgb;
    vec3 cloudsC = mix(midC, farC, 1.0 - smoothstep(horizon + 45.0, horizon + 90.0, v.y));
    view = mix(view, cloudsC, smoothstep(horizon - 4.0, horizon + 12.0, v.y));

    // near wisps: procedural, soft, fast
    vec2 np = vec2(v.x - u_speed.z * t, v.y * 1.8) * u_cloud.w;
    float n = fbm(np + vec2(0.0, t * 0.04));
    float wisp = smoothstep(0.52, 0.82, n) * u_cloud.z * smoothstep(horizon + 10.0, horizon + 120.0, v.y);
    view = mix(view, vec3(0.98, 0.99, 1.0), wisp);

    col = mix(base, view, glass);

    if (u_still < 0.5) { // diagonal glint sweeping the glass now and then
      float u = mod(t, u_glint.x) / u_glint.y;
      if (u < 1.0) {
        float s = ((p.x - 612.0) + (p.y - 366.0) * 0.55) / (308.0 + 464.0 * 0.55);
        float g = exp(-pow((s - (u * 1.5 - 0.25)) / 0.035, 2.0)) * sin(3.14159 * u);
        col = screenBlend(col, vec3(g * u_glint.z * glass));
      }
    }
  }

  if (u_still < 0.5) {
    float breath = 0.75 + 0.25 * sin(t * TAU / u_rays.w);
    // god rays from the top corner of the glass into the cabin
    vec2 d = p - u_rays.xy;
    float a = atan(d.y, d.x), r = length(d);
    float stripes = (0.5 + 0.5 * sin(a * 15.0 + sin(a * 4.0 + t * 0.25) * 2.0)) *
                    (0.55 + 0.45 * sin(a * 27.0 - t * 0.17));
    float cone = smoothstep(-0.15, 0.6, sin(a));        // mostly downwards
    float fall = exp(-r / 560.0) * smoothstep(10.0, 140.0, r);
    float rays = stripes * cone * fall * u_rays.z * breath * (1.0 - 0.6 * glass);
    col = screenBlend(col, rays * vec3(1.0, 0.94, 0.82));
    // warm patch on the wall, pulsing with the rays
    vec2 sd = (p - u_spot.xy) / vec2(u_spot.z, u_spot.z * 0.7);
    float spot = exp(-dot(sd, sd) * 2.2) * u_spot.w * breath * (1.0 - glass);
    col = screenBlend(col, spot * vec3(1.0, 0.86, 0.66));
  }

  outColor = vec4(col, 1.0);
}
`

export const HOTELS = COMMON + `
uniform sampler2D u_maskA;     // R view, G sky, B water
uniform sampler2D u_maskB;     // R casements, G curtain, B plant
uniform vec2 u_wind;           // speed, gust strength
uniform float u_windScale;     // 1, or less with reduced motion
uniform vec4 u_caseL;          // hinge x, width, center y, (unused)
uniform vec4 u_caseR;
uniform vec2 u_case;           // max angle (rad), lag (s)
uniform vec4 u_curtain;        // length, amp, wave length, speed
uniform vec2 u_curtain2;       // billow, center x
uniform vec3 u_plant;          // pivot.xy, max angle (rad)
uniform vec2 u_sky;            // drift, period
uniform vec2 u_water;          // ripple, sparkle
uniform float u_still;         // 1 = reduced motion

const vec2 VIEW_C = vec2(764.0, 485.0);

// One wind for everything: a slow swell plus occasional gusts. Roughly -0.5…1.
float gust(float t) {
  float s = t * u_wind.x;
  float swell = noise1(s) - 0.5;
  float g = pow(noise1(s * 0.37 + 11.0), 3.0) * u_wind.y * 1.6;
  return (swell + g * 0.8) * u_windScale;
}

vec2 casement(vec2 p, vec4 c, float side, float ang) {
  // rotate around the hinge (Y axis, perspective): the leaf foreshortens and its
  // free edge grows/shrinks a little; the hinge side stays put.
  float dx = (p.x - c.x) * side;                      // distance from the hinge, ≥ 0
  float sx = 1.0 + ang * 1.4;
  float persp = 1.0 + ang * 0.5 * clamp(dx / c.y, 0.0, 1.0);
  return vec2(c.x + side * dx / sx, c.z + (p.y - c.z) / persp);
}

void main() {
  vec2 p = srcPos();
  float t = u_time;
  vec3 A = texture(u_maskA, p / SIZE).rgb;
  vec3 B = texture(u_maskB, p / SIZE).rgb;
  vec3 col = img(p);
  float w = gust(t);

  // the view: parallax, drifting clouds, glittering sea
  if (A.r > 0.002) {
    vec2 v = VIEW_C + (p - VIEW_C) / 1.04 - u_par;
    if (u_still < 0.5) {
      v.x -= A.g * u_sky.x * sin(t * TAU / u_sky.y);
      v += A.g * 1.5 * (vec2(noise2(v * 0.01 + t * 0.03), noise2(v * 0.01 - t * 0.02)) - 0.5);
      float rip = sin(v.x * 0.11 + t * 2.1) * 0.6 + sin(v.x * 0.047 - t * 1.4 + v.y * 0.21) * 0.4;
      v.y += A.b * rip * u_water.x;
    }
    vec3 viewC = img(v);
    if (u_still < 0.5) {
      float lum = dot(viewC, vec3(0.3, 0.59, 0.11));
      float tw = pow(noise2(v * vec2(0.35, 0.9) + vec2(t * 1.3, -t * 0.6)), 9.0) * 4.0;
      viewC += A.b * tw * smoothstep(0.45, 0.85, lum) * u_water.y;
    }
    col = mix(col, viewC, A.r);
  }

  // casements, swinging with the wind (left one leads)
  if (B.r > 0.002) {
    float angL = u_case.x * (w + 0.18 * sin(t * 0.9));
    float angR = u_case.x * (gust(t - u_case.y) + 0.18 * sin(t * 0.9 - 1.1));
    vec2 s = p.x < 768.0 ? casement(p, u_caseL, 1.0, angL) : casement(p, u_caseR, -1.0, angR);
    col = mix(col, img(s), B.r);
  }

  // plant on the sill, nodding with the same wind
  if (B.b > 0.002) {
    float ang = u_plant.z * (w * 0.9 + 0.2 * sin(t * 1.7));
    vec2 s = u_plant.xy + rot(-ang) * (p - u_plant.xy);
    col = mix(col, img(s), B.b);
  }

  // curtain: pinned at the top, a cloth wave growing downwards, billows on gusts
  if (B.g > 0.002) {
    float h = clamp(p.y / u_curtain.x, 0.0, 1.0);
    float amp = u_curtain.y * pow(h, 1.4);
    float wave = sin(p.y * TAU / u_curtain.z - t * u_curtain.w + p.x * 0.012) * 0.6
               + sin(p.y * TAU / (u_curtain.z * 0.53) - t * u_curtain.w * 1.7) * 0.25;
    float dx = amp * (wave * (0.4 + 0.6 * abs(w) + 0.3) + w * 1.1);
    float billow = 1.0 + u_curtain2.x * max(w, 0.0) * h;
    vec2 s = vec2(u_curtain2.y + (p.x - u_curtain2.y - dx) / billow, p.y);
    col = mix(col, img(s), B.g);
  }

  outColor = vec4(col, 1.0);
}
`

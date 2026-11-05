import { Skia } from '@shopify/react-native-skia'

// SkSL port of the web shaders (src/scenes/shaders.js of the web prototype).
// The shader re-samples the illustration inside the masks: UV shifts (scroll,
// wave, sway) plus a little light. p = source pixels of the 1536×1024 picture.
// Children (uniform shader) are image shaders laid out 1:1 in source pixels.

const COMMON = `
uniform float2 u_box;    // top-left of the scene box in canvas coords
uniform float u_scale;   // source px per canvas px
uniform float u_time;    // s, advances only while the scene runs
uniform float2 u_par;    // tilt parallax, source px

const float2 SIZE = float2(1536.0, 1024.0);
const float TAU = 6.28318530718;

float2x2 rot(float a) { float c = cos(a); float s = sin(a); return float2x2(c, s, -s, c); }
float hash1(float n) { return fract(sin(n) * 43758.5453123); }
float hash2(float2 p) { return fract(sin(dot(p, float2(127.1, 311.7))) * 43758.5453123); }
float noise1(float x) { float i = floor(x); float f = fract(x); f = f * f * (3.0 - 2.0 * f); return mix(hash1(i), hash1(i + 1.0), f); }
float noise2(float2 p) {
  float2 i = floor(p); float2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash2(i), hash2(i + float2(1, 0)), f.x), mix(hash2(i + float2(0, 1)), hash2(i + float2(1, 1)), f.x), f.y);
}
float fbm(float2 p) { float v = 0.0; float a = 0.5; for (int i = 0; i < 5; i++) { v += a * noise2(p); p = p * 2.03 + 17.0; a *= 0.5; } return v; }
float3 screenBlend(float3 base, float3 light) { return 1.0 - (1.0 - base) * (1.0 - light); }
`

const FLIGHTS = `
uniform shader u_img;
uniform shader u_mask;     // R glass
uniform shader u_far;      // seamless cloud strips, repeat in x
uniform shader u_mid;
${COMMON}
uniform float2 u_farSize;
uniform float2 u_midSize;
uniform float3 u_speed;    // far, mid, near: source px/s (+ = to the right)
uniform float4 u_cloud;    // horizon, mid scale, near opacity, near size
uniform float3 u_sway;     // amp (src px), period, horizon tilt (rad)
uniform float4 u_turb;     // every, jitter, duration, amp
uniform float4 u_rays;     // origin.xy, intensity, period
uniform float3 u_glint;    // every, duration, intensity
uniform float4 u_spot;     // center.xy, radius, intensity
uniform float u_still;

float3 img(float2 p) { return u_img.eval(clamp(p, float2(0.5), SIZE - 0.5)).rgb; }

float2 turbulence(float t) {
  float k = floor(t / u_turb.x);
  float start = k * u_turb.x + (hash1(k * 7.13) - 0.5) * 2.0 * u_turb.y + u_turb.x * 0.5;
  float u = (t - start) / u_turb.z;
  if (u < 0.0 || u > 1.0) return float2(0.0);
  return sin(3.14159 * u) * u_turb.w * (float2(noise1(t * 28.0), noise1(t * 31.0 + 9.0)) - 0.5) * 2.0;
}

half4 main(float2 xy) {
  float2 p = (xy - u_box) * u_scale;
  float3 base = img(p);
  float glass = u_mask.eval(clamp(p, float2(0.5), SIZE - 0.5)).r;
  float t = u_time;
  float3 col = base;
  const float2 GLASS_C = float2(766.0, 598.0);

  if (glass > 0.002) {
    float bob = sin(t * TAU / u_sway.y) * u_sway.x;
    float ang = u_sway.z * sin(t * TAU / (u_sway.y * 1.37) + 1.3);
    float2 q = rot(-ang) * (p - GLASS_C);
    q -= float2(0.0, bob) + turbulence(t) + u_par;
    float2 v = GLASS_C + q / 1.06;
    float3 view = img(v);

    float horizon = u_cloud.x;
    float2 farUV = float2(v.x - u_speed.x * t, clamp(v.y - horizon, 0.5, u_farSize.y - 0.5));
    float2 midUV = float2((v.x - u_speed.y * t) / u_cloud.y, clamp((v.y - (horizon + 22.0)) / u_cloud.y, 0.5, u_midSize.y - 0.5));
    float3 farC = u_far.eval(farUV).rgb;
    float3 midC = u_mid.eval(midUV).rgb;
    float3 cloudsC = mix(midC, farC, 1.0 - smoothstep(horizon + 45.0, horizon + 90.0, v.y));
    view = mix(view, cloudsC, smoothstep(horizon - 4.0, horizon + 12.0, v.y));

    float2 np = float2(v.x - u_speed.z * t, v.y * 1.8) * u_cloud.w;
    float n = fbm(np + float2(0.0, t * 0.04));
    float wisp = smoothstep(0.52, 0.82, n) * u_cloud.z * smoothstep(horizon + 10.0, horizon + 120.0, v.y);
    view = mix(view, float3(0.98, 0.99, 1.0), wisp);

    col = mix(base, view, glass);

    if (u_still < 0.5) {
      float u = mod(t, u_glint.x) / u_glint.y;
      if (u < 1.0) {
        float s = ((p.x - 612.0) + (p.y - 366.0) * 0.55) / (308.0 + 464.0 * 0.55);
        float g = exp(-pow((s - (u * 1.5 - 0.25)) / 0.035, 2.0)) * sin(3.14159 * u);
        col = screenBlend(col, float3(g * u_glint.z * glass));
      }
    }
  }

  if (u_still < 0.5) {
    float breath = 0.75 + 0.25 * sin(t * TAU / u_rays.w);
    float2 d = p - u_rays.xy;
    float a = atan(d.y, d.x);
    float r = length(d);
    float stripes = (0.5 + 0.5 * sin(a * 15.0 + sin(a * 4.0 + t * 0.25) * 2.0)) * (0.55 + 0.45 * sin(a * 27.0 - t * 0.17));
    float cone = smoothstep(-0.15, 0.6, sin(a));
    float fall = exp(-r / 560.0) * smoothstep(10.0, 140.0, r);
    float rays = stripes * cone * fall * u_rays.z * breath * (1.0 - 0.6 * glass);
    col = screenBlend(col, rays * float3(1.0, 0.94, 0.82));
    float2 sd = (p - u_spot.xy) / float2(u_spot.z, u_spot.z * 0.7);
    float spot = exp(-dot(sd, sd) * 2.2) * u_spot.w * breath * (1.0 - glass);
    col = screenBlend(col, spot * float3(1.0, 0.86, 0.66));
  }
  return half4(half3(col), 1.0);
}
`

const HOTELS = `
uniform shader u_img;
uniform shader u_maskA;    // R view, G sky, B water
uniform shader u_maskB;    // R casements, G curtain, B plant
uniform shader u_maskC;    // R trees
${COMMON}
uniform float2 u_wind;     // speed, gust
uniform float u_windScale;
uniform float4 u_caseL;    // hinge x, width, center y, -
uniform float4 u_caseR;
uniform float2 u_case;     // max angle (rad), lag (s)
uniform float4 u_curtain;  // length, amp, wave length, speed
uniform float2 u_curtain2; // billow, center x
uniform float3 u_plant;    // pivot.xy, max angle (rad)
uniform float2 u_sky;      // drift, period
uniform float2 u_water;    // ripple, sparkle
uniform float2 u_trees;    // amp, flutter speed
uniform float u_still;

float3 img(float2 p) { return u_img.eval(clamp(p, float2(0.5), SIZE - 0.5)).rgb; }
float3 maskA(float2 p) { return u_maskA.eval(clamp(p, float2(0.5), SIZE - 0.5)).rgb; }
float3 maskB(float2 p) { return u_maskB.eval(clamp(p, float2(0.5), SIZE - 0.5)).rgb; }

float gust(float t) {
  float s = t * u_wind.x;
  float swell = noise1(s) - 0.5;
  float g = pow(noise1(s * 0.37 + 11.0), 3.0) * u_wind.y * 1.6;
  return (swell + g * 0.8) * u_windScale;
}

float2 casement(float2 p, float4 c, float side, float ang) {
  float dx = (p.x - c.x) * side;
  float sx = 1.0 + ang * 1.4;
  float persp = 1.0 + ang * 0.5 * clamp(dx / c.y, 0.0, 1.0);
  return float2(c.x + side * dx / sx, c.z + (p.y - c.z) / persp);
}

half4 main(float2 xy) {
  float2 p = (xy - u_box) * u_scale;
  float t = u_time;
  float3 A = maskA(p);
  float3 B = maskB(p);
  float3 col = img(p);
  float w = gust(t);
  const float2 VIEW_C = float2(764.0, 485.0);

  if (A.r > 0.002) {
    float2 v = VIEW_C + (p - VIEW_C) / 1.04 - u_par;
    if (u_still < 0.5) {
      float edge = smoothstep(474.0, 580.0, p.x) * (1.0 - smoothstep(950.0, 1052.0, p.x));
      v.x -= A.g * edge * u_sky.x * sin(t * TAU / u_sky.y);
      v += A.g * 2.5 * (float2(noise2(v * 0.008 + t * 0.05), noise2(v * 0.008 - t * 0.04)) - 0.5);
      float rip = sin(v.x * 0.11 - t * 2.6) * 0.6 + sin(v.x * 0.047 + v.y * 0.21 - t * 1.7) * 0.4;
      v.y += A.b * rip * u_water.x;
      v.x += A.b * sin(v.y * 0.32 - t * 3.1) * u_water.x * 0.7;
      float C = u_maskC.eval(clamp(p, float2(0.5), SIZE - 0.5)).r;
      float flutter = noise2(v * 0.035 + float2(t * u_trees.y, 0.0)) - 0.5;
      v.x += C * u_trees.x * (flutter * 1.2 + w * 0.9);
      v.y += C * u_trees.x * 0.35 * (noise2(v * 0.05 - t * u_trees.y * 0.8) - 0.5);
    }
    float3 viewC = img(v);
    if (u_still < 0.5) {
      float lum = dot(viewC, float3(0.3, 0.59, 0.11));
      float tw = pow(noise2(v * float2(0.35, 0.9) + float2(t * 1.3, -t * 0.6)), 9.0) * 4.0;
      viewC += A.b * tw * smoothstep(0.45, 0.85, lum) * u_water.y;
    }
    col = mix(col, viewC, A.r);
  }

  if (B.r > 0.002) {
    float angL = u_case.x * (w + 0.18 * sin(t * 0.9));
    float angR = u_case.x * (gust(t - u_case.y) + 0.18 * sin(t * 0.9 - 1.1));
    float2 s = p.x < 768.0 ? casement(p, u_caseL, 1.0, angL) : casement(p, u_caseR, -1.0, angR);
    col = mix(col, img(s), B.r);
  }

  if (B.b > 0.002) {
    float ang = u_plant.z * (w * 0.9 + 0.2 * sin(t * 1.7));
    float2 s = u_plant.xy + rot(-ang) * (p - u_plant.xy);
    col = mix(col, img(s), B.b);
  }

  if (B.g > 0.002) {
    float h = clamp(p.y / u_curtain.x, 0.0, 1.0);
    float amp = u_curtain.y * pow(h, 1.4);
    float wave = sin(p.y * TAU / u_curtain.z - t * u_curtain.w + p.x * 0.012) * 0.6
               + sin(p.y * TAU / (u_curtain.z * 0.53) - t * u_curtain.w * 1.7) * 0.25;
    float dx = amp * (wave * (0.4 + 0.6 * abs(w) + 0.3) + w * 1.1);
    float billow = 1.0 + u_curtain2.x * max(w, 0.0) * h;
    float2 s = float2(u_curtain2.y + (p.x - u_curtain2.y - dx) / billow, p.y);
    col = mix(col, img(s), B.g);
  }
  return half4(half3(col), 1.0);
}
`

function make(src, name) {
  const effect = Skia.RuntimeEffect.Make(src)
  if (!effect) throw new Error(`SkSL compile failed: ${name}`)
  return effect
}

export const flightsEffect = make(FLIGHTS, 'flights')
export const hotelsEffect = make(HOTELS, 'hotels')

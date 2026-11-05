import { useEffect, useMemo, useState } from 'react'
import { Platform } from 'react-native'
import { Blur, Canvas, Group, Image, ImageShader, LinearGradient, Mask, Paint, Rect, Shader, useImage, vec } from '@shopify/react-native-skia'
import { DeviceMotion } from 'expo-sensors'
import { Easing, useDerivedValue, useFrameCallback, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated'
import { flightsEffect, hotelsEffect } from './shaders'
import { FlightsActors, HotelsSkyActors, HotelsTownActors, HotelsWaterActors } from './actors'
import { SCENE_CONFIG as C } from './config'
import { color, motion } from '../theme/tokens'

/*
 * The living header: both scenes in one Skia canvas, each a cinemagraph shader
 * over its illustration plus masked actors. Tab change morphs one into the
 * other (crossfade + scale + short blur, interruptible). Phone tilt shifts the
 * view ±4 pt. The clock only advances while `running` is true (header visible,
 * app active), so the scene pauses and resumes in place.
 */

const SCENES = {
  flights: { height: 358, top: -57, width: 537 },
  hotels: { height: 321, top: 0, width: 481.5 },
}
const ORIGIN_Y = 152 // both openings are centred at this y
const HERO_H = 440
const DEG = Math.PI / 180
const EASE = Easing.bezier(...motion.ease)

const img = {
  flights: require('../../assets/scenes/flights.png'),
  flightsMask: require('../../assets/scenes/flights-pack-a.png'),
  flightsFar: require('../../assets/scenes/flights-tile-far.png'),
  flightsMid: require('../../assets/scenes/flights-tile-mid.png'),
  flightsGlass: require('../../assets/scenes/flights-glass-alpha.png'),
  hotels: require('../../assets/scenes/hotels.png'),
  hotelsA: require('../../assets/scenes/hotels-pack-a.png'),
  hotelsB: require('../../assets/scenes/hotels-pack-b.png'),
  hotelsC: require('../../assets/scenes/hotels-pack-c.png'),
  hotelsSky: require('../../assets/scenes/hotels-sky-alpha.png'),
  hotelsWater: require('../../assets/scenes/hotels-water-alpha.png'),
  hotelsView: require('../../assets/scenes/hotels-view-alpha.png'),
}
const FULL = { x: 0, y: 0, width: 1536, height: 1024 }

function staticUniforms(id, left, reduced) {
  const s = SCENES[id], srcPerPt = 1024 / s.height
  const base = { u_box: [left, s.top], u_scale: srcPerPt, u_still: reduced ? 1 : 0 }
  if (id === 'flights') {
    const f = C.flights, glassW = 308, dir = f.direction
    return {
      ...base,
      u_farSize: [240, 72], u_midSize: [155, 160],
      u_speed: [dir * glassW / f.clouds.far.secondsPerWindow, dir * glassW / f.clouds.mid.secondsPerWindow, dir * glassW / f.clouds.near.secondsPerWindow],
      u_cloud: [f.clouds.horizon, f.clouds.mid.scale, f.clouds.near.opacity, f.clouds.near.size],
      u_sway: [f.sway.amp * srcPerPt, f.sway.period, f.sway.horizonTilt * DEG],
      u_turb: [f.turbulence.every, f.turbulence.jitter, f.turbulence.duration, f.turbulence.amp * srcPerPt],
      u_rays: [...f.rays.origin, f.rays.intensity, f.rays.period],
      u_glint: [f.glint.every, f.glint.duration, f.glint.intensity],
      u_spot: [...f.spot.center, f.spot.radius, f.spot.intensity],
    }
  }
  const h = C.hotels, cs = h.casements
  return {
    ...base,
    u_wind: [h.wind.speed, h.wind.gust],
    u_windScale: reduced ? C.reduced.windScale : 1,
    u_caseL: [cs.left.hinge, cs.left.width, cs.left.centerY, 0],
    u_caseR: [cs.right.hinge, cs.right.width, cs.right.centerY, 0],
    u_case: [cs.maxDeg * DEG, cs.lag],
    u_curtain: [h.curtain.length, h.curtain.amp, h.curtain.wave, h.curtain.speed],
    u_curtain2: [h.curtain.billow, h.curtain.centerX],
    u_plant: [...h.plant.pivot, h.plant.maxDeg * DEG],
    u_sky: [h.sky.drift, h.sky.period],
    u_water: [h.water.ripple, h.water.sparkle],
    u_trees: [h.trees.amp, h.trees.flutter],
  }
}

function useTilt(enabled) {
  const x = useSharedValue(0), y = useSharedValue(0)
  useEffect(() => {
    if (!enabled) return
    let sub, base = null
    const clamp = (v) => Math.max(-1, Math.min(1, v))
    const spring = { damping: 18, stiffness: 90 }
    DeviceMotion.requestPermissionsAsync().catch(() => {}).finally(() => {
      DeviceMotion.setUpdateInterval(33)
      sub = DeviceMotion.addListener(({ rotation }) => {
        if (!rotation) return
        if (!base) base = { g: rotation.gamma, b: rotation.beta }
        base.g += (rotation.gamma - base.g) * 0.004 // the neutral pose follows the hand slowly
        base.b += (rotation.beta - base.b) * 0.004
        x.value = withSpring(clamp((rotation.gamma - base.g) / (18 * DEG)) * C.tilt.amp, spring)
        y.value = withSpring(clamp((rotation.beta - base.b) / (18 * DEG)) * 0.6 * C.tilt.amp, spring)
      })
    })
    return () => sub?.remove()
  }, [enabled, x, y])
  return { x, y }
}

function Scene({ id, width, time, tilt, reduced, images }) {
  const s = SCENES[id]
  const left = (width - s.width) / 2
  const box = useMemo(() => ({ left, top: s.top, k: s.height / 1024 }), [left, s])
  const stat = useMemo(() => staticUniforms(id, left, reduced), [id, left, reduced])
  const srcPerPt = 1024 / s.height
  const timeScale = reduced ? (id === 'flights' ? 0 : C.reduced.timeScale) : 1
  const uniforms = useDerivedValue(() => ({ ...stat, u_time: time.value * timeScale, u_par: [tilt.x.value * srcPerPt, tilt.y.value * srcPerPt] }))
  const rect = { x: left, y: s.top, width: s.width, height: s.height }
  const alpha = (image) => <Image image={image} {...rect} fit="fill" />

  if (id === 'flights') {
    return (
      <>
        <Rect {...rect}>
          <Shader source={flightsEffect} uniforms={uniforms}>
            <ImageShader image={images.flights} fit="none" rect={FULL} />
            <ImageShader image={images.flightsMask} fit="none" rect={FULL} />
            <ImageShader image={images.flightsFar} fit="none" tx="repeat" ty="clamp" rect={{ x: 0, y: 0, width: 240, height: 72 }} />
            <ImageShader image={images.flightsMid} fit="none" tx="repeat" ty="clamp" rect={{ x: 0, y: 0, width: 155, height: 160 }} />
          </Shader>
        </Rect>
        {!reduced && <Mask mode="alpha" mask={alpha(images.flightsGlass)}><FlightsActors time={time} box={box} /></Mask>}
      </>
    )
  }
  return (
    <>
      <Rect {...rect}>
        <Shader source={hotelsEffect} uniforms={uniforms}>
          <ImageShader image={images.hotels} fit="none" rect={FULL} />
          <ImageShader image={images.hotelsA} fit="none" rect={FULL} />
          <ImageShader image={images.hotelsB} fit="none" rect={FULL} />
          <ImageShader image={images.hotelsC} fit="none" rect={FULL} />
        </Shader>
      </Rect>
      {!reduced && (
        <>
          <Mask mode="alpha" mask={alpha(images.hotelsSky)}><HotelsSkyActors time={time} box={box} /></Mask>
          <Mask mode="alpha" mask={alpha(images.hotelsWater)}><HotelsWaterActors time={time} box={box} /></Mask>
          <Mask mode="alpha" mask={alpha(images.hotelsView)}><HotelsTownActors time={time} box={box} /></Mask>
        </>
      )}
    </>
  )
}

export default function LiveHeader({ tab, width, running, reduced }) {
  const active = tab === 'flights' ? 'flights' : 'hotels'
  const images = {}
  for (const [k, src] of Object.entries(img)) images[k] = useImage(src) // eslint-disable-line react-hooks/rules-of-hooks
  const ready = Object.values(images).every(Boolean)

  // scene clock: advances only while running
  const time = useSharedValue(0)
  useFrameCallback((f) => {
    if (running.value) time.value += Math.min((f.timeSincePreviousFrame ?? 16) / 1000, 0.1)
  })
  const tilt = useTilt(!reduced && Platform.OS !== 'web') // no motion sensor in the web preview

  // morph between scenes
  const op = { flights: useSharedValue(active === 'flights' ? 1 : 0), hotels: useSharedValue(active === 'hotels' ? 1 : 0) }
  const sc = { flights: useSharedValue(1), hotels: useSharedValue(1) }
  const blur = useSharedValue(0)
  const [both, setBoth] = useState(false)
  const [shown, setShown] = useState(active)
  useEffect(() => {
    if (shown === active && !both) return
    setBoth(true)
    const d = 600
    for (const id of ['flights', 'hotels']) {
      const incoming = id === active
      if (reduced) { op[id].value = withTiming(incoming ? 1 : 0, { duration: d, easing: EASE }); continue }
      if (incoming && op[id].value < 0.02) sc[id].value = 0.98
      op[id].value = withTiming(incoming ? 1 : 0, { duration: d, easing: EASE })
      sc[id].value = withTiming(incoming ? 1 : 1.02, { duration: d, easing: EASE })
    }
    if (!reduced) blur.value = withSequence(withTiming(6, { duration: d / 2 }), withTiming(0, { duration: d / 2 }))
    const timer = setTimeout(() => { setBoth(false); setShown(active) }, d + 40)
    return () => clearTimeout(timer)
  }, [active]) // eslint-disable-line react-hooks/exhaustive-deps

  const origin = vec(width / 2, ORIGIN_Y)
  const tf = {
    flights: useDerivedValue(() => [{ scale: sc.flights.value }]),
    hotels: useDerivedValue(() => [{ scale: sc.hotels.value }]),
  }
  const visible = both ? ['flights', 'hotels'] : [active]

  return (
    <Canvas style={{ width, height: HERO_H }}>
      <Rect x={0} y={0} width={width} height={HERO_H} color={color.bgScreen} />
      {ready && visible.map((id) => (
        <Group key={id} opacity={op[id]} transform={tf[id]} origin={origin}
               layer={both && !reduced ? <Paint><Blur blur={blur} /></Paint> : undefined}>
          <Scene id={id} width={width} time={time} tilt={tilt} reduced={reduced} images={images} />
        </Group>
      ))}
      {/* the scene dissolves into the page instead of ending on a hard edge */}
      <Rect x={0} y={230} width={width} height={71}>
        <LinearGradient start={vec(0, 230)} end={vec(0, 300)} colors={['rgba(245,245,245,0)', color.bgScreen]} />
      </Rect>
      <Rect x={0} y={300} width={width} height={HERO_H - 300} color={color.bgScreen} />
    </Canvas>
  )
}

import { useEffect, useRef, useState } from 'react'
import { AppState, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import * as Haptics from 'expo-haptics'
import Animated, {
  Easing, FadeIn, FadeInDown, FadeOut, FadeOutUp, LinearTransition, interpolate, Extrapolation,
  useAnimatedScrollHandler, useAnimatedStyle, useDerivedValue, useReducedMotion, useSharedValue,
} from 'react-native-reanimated'
import LiveHeader from './scenes/LiveHeader'
import SearchTab from './components/SearchTab'
import RouteFields from './components/RouteFields'
import HotelFields from './components/HotelFields'
import SearchButton from './components/SearchButton'
import ShortcutTile from './components/ShortcutTile'
import PlanCard from './components/PlanCard'
import GlassButton from './components/GlassButton'
import { BedIcon, FireSticker, GlobeSticker, NavigationIcon, NavigationSticker, PlaneIcon, SparklesSticker } from './components/icons'
import { color, motion, radius, size, space, text } from './theme/tokens'

// Figma: Handoff → code (110:755) — Flights 106:283, Hotels 110:569.
const TABS = [
  { id: 'flights', label: 'Flights', Icon: PlaneIcon },
  { id: 'hotels', label: 'Hotels', Icon: BedIcon },
  { id: 'tours', label: 'Tours', Icon: NavigationIcon },
]
const SHORTCUTS = [
  { label: 'Hot\ntickets', Icon: FireSticker },
  { label: 'Surprise\nme', Icon: GlobeSticker },
  { label: 'Smart\nsearch', Icon: SparklesSticker },
  { label: 'Custom\nroute', Icon: NavigationSticker },
]
const PLAN_TEXT = [
  { title: 'Watch\nthe whales', city: 'Murmansk', price: 'from 5,389 ₽' },
  { title: 'Catch a sunrise\nin the sky', city: 'Murmansk', price: 'from 5,389 ₽' },
  { title: 'Take in\nthe wild nature', city: 'Murmansk', price: 'from 5,389 ₽' },
  { title: 'Hike up\nto Kazbegi', city: 'Murmansk', price: 'from 5,389 ₽' },
]
const PLAN_IMAGES = {
  flights: [require('../assets/img/whales.jpg'), require('../assets/img/sunrise.jpg'), require('../assets/img/kasbah.jpg'), require('../assets/img/mountains.jpg')],
  hotels: [require('../assets/img/hotel-house.jpg'), require('../assets/img/hotel-meadow.jpg'), require('../assets/img/kasbah.jpg'), require('../assets/img/mountains.jpg')],
}
const avatar = require('../assets/img/avatar.png')

const EASE = Easing.bezier(...motion.ease)
const SHEET_TOP = size.hero - size.heroOverlap // 296: the search sheet slides over the header from here
const RECEDE = 300 // scroll distance over which the scene recedes
const layoutOf = (tab) => (tab === 'hotels' ? 'hotels' : 'flights')

export default function Screen() {
  const { width } = useWindowDimensions()
  const insets = useSafeAreaInsets()
  const reduced = useReducedMotion()
  const [tab, setTab] = useState('flights')
  const [route, setRoute] = useState({ from: 'Perm', to: '' })
  const [hotel, setHotel] = useState({ destination: '', dates: '', guests: '2 adults' })
  const [loading, setLoading] = useState(false)
  const [liked, setLiked] = useState(true) // both Figma screens show Favorite Active
  const layout = layoutOf(tab)

  // scroll: the header is pinned, the content slides over it
  const scrollY = useSharedValue(0)
  const appActive = useSharedValue(true)
  const onScroll = useAnimatedScrollHandler((e) => { scrollY.value = e.contentOffset.y })
  const running = useDerivedValue(() => appActive.value && scrollY.value < SHEET_TOP + 4)
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => { appActive.value = s === 'active' })
    return () => sub.remove()
  }, [appActive])

  const heroStyle = useAnimatedStyle(() => {
    const y = scrollY.value
    if (y < 0) return { transform: [{ scale: 1 + -y / size.hero }] } // pull-down stretches the scene
    const k = interpolate(y, [0, RECEDE], [0, 1], Extrapolation.CLAMP)
    return { transform: [{ translateY: -0.3 * RECEDE * k }, { scale: 1 + 0.06 * k }] }
  })
  const dimStyle = useAnimatedStyle(() => ({ opacity: interpolate(scrollY.value, [0, RECEDE], [0, 0.15], Extrapolation.CLAMP) }))

  const select = (id) => {
    if (id === tab) return
    Haptics.selectionAsync()
    setTab(id)
  }
  const submitTimer = useRef(0)
  const search = () => {
    setLoading(true)
    clearTimeout(submitTimer.current)
    submitTimer.current = setTimeout(() => setLoading(false), 1400)
  }

  return (
    <View style={s.screen}>
      <StatusBar style="dark" />

      <Animated.View style={[s.hero, { transformOrigin: 'top' }, heroStyle]} pointerEvents="none">
        <LiveHeader tab={tab} width={width} running={running} reduced={reduced} />
        <Animated.View style={[StyleSheet.absoluteFill, s.dim, dimStyle]} />
      </Animated.View>

      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={[s.content, { paddingBottom: insets.bottom + size.glassFavorite + 48 }]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={s.card} layout={LinearTransition.duration(450).easing(EASE)}>
          <View style={s.tabs} accessibilityRole="tablist">
            {TABS.map((t) => <SearchTab key={t.id} label={t.label} Icon={t.Icon} selected={tab === t.id} onPress={() => select(t.id)} />)}
          </View>
          <Animated.View key={layout} style={s.form} entering={FadeInDown.duration(320).delay(60).easing(EASE)} exiting={FadeOutUp.duration(160)}>
            {layout === 'hotels' ? (
              <HotelFields {...hotel}
                onDestination={(v) => setHotel((h) => ({ ...h, destination: v }))}
                onDates={(v) => setHotel((h) => ({ ...h, dates: v }))}
                onGuests={(v) => setHotel((h) => ({ ...h, guests: v }))} />
            ) : (
              <RouteFields {...route} onFrom={(v) => setRoute((r) => ({ ...r, from: v }))} onTo={(v) => setRoute((r) => ({ ...r, to: v }))} />
            )}
            <SearchButton label={layout === 'hotels' ? 'Search hotels' : tab === 'tours' ? 'Search tours' : 'Search'} loading={loading} onPress={search} />
          </Animated.View>
        </Animated.View>

        <Animated.View key={`below-${layout}`} entering={FadeIn.duration(320).delay(80)} exiting={FadeOut.duration(150)}
                       layout={LinearTransition.duration(450).easing(EASE)} style={layout === 'hotels' && s.belowHotels}>
          {layout === 'flights' && (
            <View style={s.shortcuts}>
              {SHORTCUTS.map((sc) => <ShortcutTile key={sc.label} Icon={sc.Icon} label={sc.label} />)}
            </View>
          )}
          <View style={s.plans}>
            {layout === 'flights' && <Text style={s.plansTitle}>Plans for autumn</Text>}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} snapToInterval={size.cardW + space[12]} decelerationRate="fast"
                        contentContainerStyle={s.plansRow} style={s.plansScroller}>
              {PLAN_TEXT.map((p, i) => <PlanCard key={p.title} image={PLAN_IMAGES[layout][i]} {...p} />)}
            </ScrollView>
          </View>
        </Animated.View>
      </Animated.ScrollView>

      <View style={[s.tabBar, { paddingBottom: Math.max(insets.bottom, 25) }]} pointerEvents="box-none">
        <GlassButton content="avatar" avatar={avatar} label="Profile" />
        <GlassButton content="favorite" active={liked} onToggle={setLiked} label="Favourites" />
      </View>
    </View>
  )
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bgScreen },
  hero: { position: 'absolute', top: 0, left: 0, right: 0, height: size.hero, overflow: 'hidden' },
  dim: { backgroundColor: '#000' },
  content: { paddingTop: SHEET_TOP, paddingHorizontal: space[8] },
  card: {
    backgroundColor: color.bgBrand, borderRadius: radius[40], borderCurve: 'continuous', overflow: 'hidden',
    paddingTop: space[16], paddingHorizontal: space[20], paddingBottom: space[20], gap: space[16],
  },
  tabs: { flexDirection: 'row', justifyContent: 'center', gap: space[12] },
  form: { gap: space[16] },
  shortcuts: { flexDirection: 'row', gap: space[4], paddingTop: space[36], paddingBottom: space[32] },
  belowHotels: { paddingTop: space[20] },
  plans: {
    backgroundColor: color.bgSurface, borderRadius: radius[40], borderCurve: 'continuous', padding: space[20], gap: space[20],
    boxShadow: `inset 0 0 72px 16px ${color.glowSection}`,
  },
  plansTitle: { ...text.headingSection, color: color.textHeading },
  plansScroller: { marginHorizontal: -space[20] },
  plansRow: { paddingHorizontal: space[20], gap: space[12] },
  tabBar: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 25, paddingTop: space[16], flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
})

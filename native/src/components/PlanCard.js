import { Image, StyleSheet, Text, View } from 'react-native'
import PressScale from './PressScale'
import { color, motion, radius, size, space, text } from '../theme/tokens'

// Figma: Plan Card (104:1168) — Default / Pressed (12% dark layer on the photo + scale .97).
export default function PlanCard({ image, title, city, price }) {
  return (
    <PressScale scale={motion.scalePressedCard} style={s.card} accessibilityRole="button" accessibilityLabel={title.replace('\n', ' ')}>
      {({ pressed }) => (
        <>
          <View style={s.imageWrap}>
            <Image source={image} style={s.image} />
            {pressed && <View style={s.pressed} />}
          </View>
          <View style={s.info}>
            <Text style={s.title}>{title}</Text>
            <Text style={s.meta}>{city}</Text>
            <Text style={s.meta}>{price}</Text>
          </View>
        </>
      )}
    </PressScale>
  )
}

const s = StyleSheet.create({
  card: { width: size.cardW, gap: space[12] },
  imageWrap: { width: size.cardW, height: size.cardW, borderRadius: radius[32], overflow: 'hidden', borderCurve: 'continuous' },
  image: { width: '100%', height: '100%' },
  pressed: { ...StyleSheet.absoluteFillObject, backgroundColor: color.overlayPressedCard },
  info: { gap: space[8] },
  title: { ...text.cardTitle, color: color.textPrimary },
  meta: { ...text.cardMeta, color: color.textPrimary },
})

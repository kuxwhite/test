// Design tokens — the same values as src/tokens.css of the web prototype,
// mirroring the Figma variables (Primitives / Color / Dimension) of file 6zX9IefdtemGiLH7nfVJqa.

const palette = {
  blue500: '#2480FF',
  blue400: '#2A94FE',
  blue100: '#ACE2FF',
  orange500: '#F7803C',
  orange400: '#FE9749',
  orange300: '#F3AA42',
  green500: '#4ABE64',
  violet400: '#DE7CEB',
  sky400: '#7DB7FF',
  pink500: '#E72D5F',
  neutral0: '#FFFFFF',
  neutral50: '#F5F5F5',
  neutral100: '#EEEEEE',
  neutral400: '#AAAAAA',
  neutral800: '#323232',
  neutral900: '#181818',
  ink900: '#262A33',
}

export const color = {
  bgScreen: palette.neutral50,
  bgSurface: palette.neutral0,
  bgSurfacePressed: palette.neutral100,
  bgBrand: palette.blue500,
  bgTabSelected: 'rgba(255,255,255,0.12)',
  bgTabPressed: 'rgba(255,255,255,0.24)',
  ctaStart: palette.orange400,
  ctaEnd: palette.orange300,
  textPrimary: palette.neutral900,
  textHeading: palette.neutral800,
  textMuted: palette.neutral400,
  textOnBrand: palette.neutral0,
  textAccent: palette.blue500,
  iconOnBrand: palette.neutral0,
  iconFavorite: palette.pink500,
  iconHot: palette.orange500,
  iconAnywhere: palette.green500,
  iconSmart: palette.violet400,
  iconRoute: palette.sky400,
  overlayPressedButton: 'rgba(0,0,0,0.08)',
  overlayPressedCard: 'rgba(0,0,0,0.12)',
  glowSection: 'rgba(255,255,255,0.2)',
}

export const space = { 4: 4, 8: 8, 12: 12, 16: 16, 20: 20, 24: 24, 32: 32, 36: 36 }
export const radius = { 16: 16, 20: 20, 24: 24, 32: 32, 40: 40, 64: 64, full: 999 }

export const size = {
  icon: 24, sticker: 48, tabW: 91, tabH: 84, fieldH: 62, buttonH: 68, tileH: 76,
  cardW: 156, glassAvatar: 48, glassFavorite: 54, avatar: 40,
  hero: 440, heroOverlap: 144, // the search sheet starts at y = 296
}

// Text styles: SF Pro Rounded (iOS «ui-rounded»), letter-spacing −1%.
const rounded = 'ui-rounded'
const ts = (fontSize, lineHeight, fontWeight) => ({ fontFamily: rounded, fontSize, lineHeight, fontWeight, letterSpacing: -fontSize * 0.01 })
export const text = {
  headingSection: ts(28, 32, '600'),
  tabLabel: ts(20, 24, '600'),
  fieldValue: ts(18, 20, '500'),
  fieldLabel: ts(12, 14, '500'),
  buttonLabel: ts(18, 20, '500'),
  shortcutLabel: ts(14, 16, '500'),
  cardTitle: ts(16, 20, '500'),
  cardMeta: ts(14, 20, '400'),
}

export const motion = {
  ease: [0.32, 0.72, 0, 1],
  scalePressedTab: 0.96,
  scalePressedButton: 0.97,
  scalePressedTile: 0.95,
  scalePressedCard: 0.97,
}

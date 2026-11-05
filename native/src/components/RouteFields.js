import { StyleSheet, View } from 'react-native'
import SearchField from './SearchField'
import { Notch } from './icons'

// Figma: Route Fields (103:1163) — From (Filled) + notch + To (Placeholder).
export default function RouteFields({ from, to, onFrom, onTo }) {
  return (
    <View style={s.stack}>
      <SearchField label="From" value={from} placeholder="From" onChangeText={onFrom} />
      <View style={s.notch}><Notch /></View>
      <SearchField label="To" value={to} placeholder="To - Vietnam" onChangeText={onTo} />
    </View>
  )
}
export const s = StyleSheet.create({
  stack: { alignSelf: 'stretch' },
  notch: { alignItems: 'center', height: 3 },
})

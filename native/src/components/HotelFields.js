import { View } from 'react-native'
import IconField from './IconField'
import { CalendarIcon, Notch, PersonIcon, SearchIcon } from './icons'
import { s } from './RouteFields'

// Figma: Hotel Fields (110:494) — Destination + Dates + Guests joined by notches.
export default function HotelFields({ destination, dates, guests, onDestination, onDates, onGuests }) {
  return (
    <View style={s.stack}>
      <IconField Icon={SearchIcon} label="Destination" placeholder="Where are you going?" value={destination} onChangeText={onDestination} />
      <View style={s.notch}><Notch /></View>
      <IconField Icon={CalendarIcon} label="Dates" placeholder="Dates" value={dates} onChangeText={onDates} />
      <View style={s.notch}><Notch /></View>
      <IconField Icon={PersonIcon} label="Guests" placeholder="Guests" value={guests} onChangeText={onGuests} />
    </View>
  )
}

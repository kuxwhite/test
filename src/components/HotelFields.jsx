import IconField from './IconField.jsx'
import { CalendarIcon, Notch, PersonIcon, SearchIcon } from './icons.jsx'

// Figma: Hotel Fields (110:494) — Destination + Dates + Guests joined by notches.
export default function HotelFields({ destination, dates, guests, onDestination, onDates, onGuests }) {
  return (
    <div className="field-stack">
      <IconField icon={<SearchIcon />} label="Destination" placeholder="Where are you going?"
                 value={destination} onChange={onDestination} />
      <Notch />
      <IconField icon={<CalendarIcon />} label="Dates" placeholder="Dates" value={dates} onChange={onDates} />
      <Notch />
      <IconField icon={<PersonIcon />} label="Guests" placeholder="Guests" value={guests} onChange={onGuests} />
    </div>
  )
}

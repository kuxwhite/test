import { SafeAreaProvider } from 'react-native-safe-area-context'
import Screen from './src/Screen'

export default function App() {
  return (
    <SafeAreaProvider>
      <Screen />
    </SafeAreaProvider>
  )
}

// Web preview only (for checking the scenes in a browser): Skia needs CanvasKit
// loaded before the screen module runs. The phone uses App.js.
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { WithSkiaWeb } from '@shopify/react-native-skia/lib/module/web'

export default function App() {
  return (
    <SafeAreaProvider>
      <WithSkiaWeb opts={{ locateFile: () => '/canvaskit.wasm' }} getComponent={() => import('./src/Screen')} fallback={null} />
    </SafeAreaProvider>
  )
}

# Window View — нативный прототип (Expo / React Native)

Тот же экран, что в веб-прототипе: Figma «Handoff → code» (Flights 106:283, Hotels 110:569),
компоненты со всеми состояниями и живая шапка «вид из окна».

## Как открыть на iPhone (без Mac)

1. Поставьте на iPhone приложение **Expo Go** из App Store.
2. На компьютере (Windows, macOS или Linux, нужен Node.js 20+):

   ```bash
   cd native
   npm install
   npx expo start
   ```

3. Отсканируйте QR-код из терминала камерой iPhone — прототип откроется в Expo Go.
   Телефон и компьютер должны быть в одной Wi-Fi-сети; если нет — `npx expo start --tunnel`.

## Что внутри

- `src/Screen.js` — экран: закреплённая шапка, лист поиска наезжает на неё при скролле
  (сцена уходит вверх в 0.3×, масштаб до 1.06, затемнение до 15%), табы переключают экран.
- `src/components/` — Search Tab, Search Field, Route Fields, Icon Field, Hotel Fields,
  Search Button, Shortcut Tile, Plan Card, Glass Button (настоящее Liquid Glass на iOS 26).
- `src/scenes/` — живая шапка на Skia: SkSL-шейдеры (`shaders.js`), «актёры» — самолёты,
  птицы, чайки, парусники, машины, люди (`actors.js`), всё движение настраивается в `config.js`.
- `src/theme/tokens.js` — токены из Figma.
- Наклон телефона сдвигает вид за окном на ±4 pt; при «Уменьшении движения» иллюминатор
  статичен, в отеле остаётся медленное покачивание.

Маски и полосы облаков в `assets/scenes/` построены скриптом `../tools/make-masks.mjs`.

`App.web.js` нужен только для проверки в браузере (`npx expo start --web`); телефон использует `App.js`.

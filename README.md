# Flights concept — анимированный прототип

Экран из Figma ([Концепты, node 89:904](https://www.figma.com/design/6zX9IefdtemGiLH7nfVJqa/?node-id=89-904)), оживлённый кодом.

- **Табы** (Flights / Hotels / Impression) переключаются через [Motion](https://motion.dev): ряд табов уезжает к активному, поля меняются со сдвигом, поля можно свайпать.
- **Видео в шапке** сделано в [Remotion](https://remotion.dev): облака плывут за иллюминатором, по стеклу проходит блик, салон слегка покачивается. Цикл 10 с, бесшовный.

## Команды

```bash
npm install
npm run dev      # прототип в браузере
npm run studio   # Remotion Studio: редактировать и смотреть видео шапки
npm run render   # отрендерить видео шапки в out/hero-window.mp4
```

## Где что

- `src/components/SearchCard.tsx` — табы и анимации переключения
- `src/components/Hero.tsx` — шапка: видео + градиенты из макета
- `src/video/HeroWindow.tsx` — сама анимация видео (всё считается от номера кадра)
- `public/assets/` — картинки из Figma

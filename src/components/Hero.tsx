import { Player } from "@remotion/player";
import { HERO_DURATION, HERO_FPS, HERO_HEIGHT, HERO_WIDTH, HeroWindow } from "../video/HeroWindow";

/** Hero Image (Figma 89:905): looping Remotion video + design overlays. */
export function Hero() {
  return (
    <div className="hero">
      <Player
        component={HeroWindow}
        durationInFrames={HERO_DURATION}
        fps={HERO_FPS}
        compositionWidth={HERO_WIDTH}
        compositionHeight={HERO_HEIGHT}
        autoPlay
        initiallyMuted
        loop
        controls={false}
        clickToPlay={false}
        doubleClickToFullscreen={false}
        spaceKeyToPlayOrPause={false}
        className="hero__video"
        style={{ width: "100%", aspectRatio: `${HERO_WIDTH} / ${HERO_HEIGHT}` }}
      />
      <div className="hero__top-fade" aria-hidden />
      <div className="hero__bottom-fade" aria-hidden />
      <div className="hero__glow" aria-hidden />
    </div>
  );
}

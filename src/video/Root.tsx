import React from "react";
import { Composition } from "remotion";
import { HERO_DURATION, HERO_FPS, HERO_HEIGHT, HERO_WIDTH, HeroWindow } from "./HeroWindow";

export const RemotionRoot: React.FC = () => (
  <Composition
    id="HeroWindow"
    component={HeroWindow}
    durationInFrames={HERO_DURATION}
    fps={HERO_FPS}
    width={HERO_WIDTH}
    height={HERO_HEIGHT}
  />
);

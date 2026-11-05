import React from "react";
import {
  AbsoluteFill,
  Img,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

// Canvas = the hero image as exported from Figma (node 90:1038).
export const HERO_WIDTH = 402;
export const HERO_HEIGHT = 344;
export const HERO_FPS = 30;
export const HERO_DURATION = 300; // 10 s, loops seamlessly

// Glass area of the window inside the hero image, in image pixels.
const GLASS = { x: 150, y: 81, w: 104, h: 164, radius: "50px / 46px" };
// The cloud texture is a seamless 54×86 tile made from a frame-free crop of
// the glass (x163, y147), scaled up a bit: nearer clouds look bigger.
const CLOUDS_H = 131;
const CLOUDS = { y: 145 - GLASS.y, h: CLOUDS_H, tileW: 82 };
const CLOUDS_STEP = CLOUDS.tileW;

const TAU = Math.PI * 2;

/**
 * Animated plane window:
 * - clouds drift past the window (seamless mirrored strip);
 * - a soft glint slides across the glass;
 * - the cabin gently sways, as in flight.
 * Every value is derived from the frame number, so the same code
 * renders identically in the Player and in `remotion render`.
 */
export const HeroWindow: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const t = frame / durationInFrames; // 0 → 1 over one loop

  // Clouds advance three tile steps per loop, so frame 0 follows the last frame seamlessly.
  const cloudsX = -((t * CLOUDS_STEP * 3) % CLOUDS_STEP);

  // Gentle sway: whole-number cycles per loop keep the loop seamless.
  const swayY = Math.sin(t * TAU * 2) * 1.6;
  const swayX = Math.sin(t * TAU) * 1.2;
  const swayRotate = Math.sin(t * TAU * 2 + 1) * 0.15;

  // Glint passes once per loop, during the middle part.
  const glintX = interpolate(t, [0.35, 0.75], [-70, GLASS.w + 70], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const glintOpacity = interpolate(t, [0.35, 0.45, 0.65, 0.75], [0, 0.55, 0.55, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const cloudsSrc = staticFile("assets/window-clouds.png");

  return (
    <AbsoluteFill style={{ backgroundColor: "#dcebfb", overflow: "hidden" }}>
      <AbsoluteFill
        style={{
          transform: `translate(${swayX}px, ${swayY}px) rotate(${swayRotate}deg) scale(1.025)`,
        }}
      >
        <Img src={staticFile("assets/hero-window.png")} style={{ width: HERO_WIDTH, height: HERO_HEIGHT }} />

        {/* Glass */}
        <div
          style={{
            position: "absolute",
            left: GLASS.x,
            top: GLASS.y,
            width: GLASS.w,
            height: GLASS.h,
            borderRadius: GLASS.radius,
            overflow: "hidden",
          }}
        >
          <Img src={staticFile("assets/window-glass.png")} style={{ position: "absolute", inset: 0, width: GLASS.w, height: GLASS.h }} />

          {/* Drifting clouds, faded in at the horizon */}
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: CLOUDS.y,
              height: CLOUDS.h,
              // One repeating background: the GPU tiles it without seams.
              backgroundImage: `url(${cloudsSrc})`,
              backgroundRepeat: "repeat-x",
              backgroundSize: `${CLOUDS.tileW}px ${CLOUDS.h}px`,
              backgroundPositionX: cloudsX,
              WebkitMaskImage: "linear-gradient(to bottom, transparent 0, #000 14px)",
              maskImage: "linear-gradient(to bottom, transparent 0, #000 14px)",
            }}
          />
          {/* Hidden copy so Remotion waits for the texture before rendering a frame */}
          <Img src={cloudsSrc} style={{ display: "none" }} />

          {/* Glint */}
          <div
            style={{
              position: "absolute",
              top: -20,
              left: glintX - 40,
              width: 40,
              height: GLASS.h + 40,
              opacity: glintOpacity,
              transform: "rotate(18deg)",
              background:
                "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.7) 50%, rgba(255,255,255,0) 100%)",
              filter: "blur(4px)",
            }}
          />

          {/* Inner shadow of the frame */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: GLASS.radius,
              boxShadow: "inset 0 0 6px 2px rgba(255,255,255,0.5)",
            }}
          />
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

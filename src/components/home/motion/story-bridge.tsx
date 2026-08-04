'use client';

import type { MotionValue } from 'framer-motion';
import { motion, useTransform } from 'framer-motion';

import type { SongThemeId } from '../songs';

import { getHomeSceneStoryProfile } from './story-profiles';

interface SceneStoryBridgeProps {
  progress: MotionValue<number>;
  theme: SongThemeId;
}

const RAIN_PATHS = [
  'M80 -80 C110 190 62 430 222 650 C330 800 430 852 500 935',
  'M240 -70 C258 210 206 458 340 675 C402 774 458 858 500 935',
  'M410 -90 C398 218 384 496 438 704 C468 816 486 875 500 935',
  'M590 -90 C602 218 616 496 562 704 C532 816 514 875 500 935',
  'M760 -70 C742 210 794 458 660 675 C598 774 542 858 500 935',
  'M920 -80 C890 190 938 430 778 650 C670 800 570 852 500 935',
] as const;

const FREEWAY_PATHS = [
  'M470 360 C412 520 262 710 54 1010',
  'M486 360 C454 535 372 730 270 1010',
  'M514 360 C546 535 628 730 730 1010',
  'M530 360 C588 520 738 710 946 1010',
] as const;

const ATLAS_GRID_PATHS = [
  'M152 804 C344 786 656 786 848 804',
  'M132 866 C336 850 664 850 868 866',
  'M116 930 C330 918 670 918 884 930',
  'M104 996 C326 988 674 988 896 996',
  'M96 1064 C322 1060 678 1060 904 1064',
  'M248 760 C286 856 302 972 296 1112',
  'M372 750 C390 858 398 978 396 1112',
  'M500 746 L500 1112',
  'M628 750 C610 858 602 978 604 1112',
  'M752 760 C714 856 698 972 704 1112',
] as const;

function AtlasGridHandoff({
  opacity,
  pathLength,
  y,
}: {
  opacity: MotionValue<number>;
  pathLength: MotionValue<number>;
  y: MotionValue<number>;
}) {
  return (
    <motion.g style={{ opacity, y }}>
      {ATLAS_GRID_PATHS.map((path) => (
        <motion.path
          key={path}
          d={path}
          pathLength="1"
          style={{ pathLength }}
        />
      ))}
      <motion.path
        d="M472 930 H488 M512 930 H528 M500 902 V918 M500 942 V958"
        stroke="var(--story-signal)"
        strokeOpacity="0.72"
        pathLength="1"
        style={{ pathLength }}
      />
    </motion.g>
  );
}

export function SceneStoryBridge({ progress, theme }: SceneStoryBridgeProps) {
  const motif = getHomeSceneStoryProfile(theme).bridge;
  const opacity = useTransform(
    progress,
    [0, 0.46, 0.62, 0.82, 0.9, 0.96, 1],
    [0, 0, 0.32, 0.92, 0.42, 0, 0],
  );
  const pathLength = useTransform(progress, [0.52, 0.92], [0, 1]);
  const pathOffset = useTransform(progress, [0.5, 1], [0.18, 0]);
  const y = useTransform(progress, [0.48, 1], [80, -34]);
  const gridOpacity = useTransform(
    progress,
    [0.62, 0.74, 0.84, 0.91, 0.96, 1],
    [0, 0.1, 0.3, 0.14, 0, 0],
  );
  const gridPathLength = useTransform(progress, [0.6, 0.9], [0, 1]);
  const gridY = useTransform(progress, [0.62, 1], [72, -10]);
  const glowOpacity = useTransform(progress, [0.58, 0.8, 1], [0, 0.42, 0]);
  const signalY = useTransform(progress, [0.52, 0.96], [330, 900]);

  const paths = motif === 'rainfall' ? RAIN_PATHS : FREEWAY_PATHS;

  return (
    <motion.div
      aria-hidden="true"
      data-story-handoff="atlas-grid"
      className="pointer-events-none fixed inset-0 z-20 overflow-hidden"
      style={{ opacity }}
    >
      <motion.div
        className="absolute inset-x-[18%] bottom-[-12%] h-[46%] rounded-[50%] bg-[radial-gradient(ellipse_at_center,var(--story-glow),transparent_68%)] blur-2xl"
        style={{ opacity: glowOpacity }}
      />
      <motion.svg
        viewBox="0 0 1000 1120"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 h-full w-full overflow-visible"
        style={{ y }}
      >
        <g
          fill="none"
          stroke="var(--story-line)"
          strokeWidth="1.15"
          vectorEffect="non-scaling-stroke"
        >
          {paths.map((path, index) => (
            <motion.path
              key={path}
              d={path}
              pathLength="1"
              strokeOpacity={0.34 + (index % 3) * 0.09}
              style={{ pathLength, pathOffset }}
            />
          ))}
        </g>

        <g
          fill="none"
          stroke="var(--story-coordinate)"
          strokeOpacity="0.42"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
        >
          <AtlasGridHandoff
            opacity={gridOpacity}
            pathLength={gridPathLength}
            y={gridY}
          />
        </g>

        <motion.circle
          cx="500"
          r="4.5"
          fill="var(--story-signal)"
          style={{ cy: signalY }}
        />
        <motion.circle
          cx="500"
          r="13"
          fill="none"
          stroke="var(--story-signal)"
          strokeOpacity="0.3"
          strokeWidth="1"
          style={{ cy: signalY }}
        />
      </motion.svg>
    </motion.div>
  );
}

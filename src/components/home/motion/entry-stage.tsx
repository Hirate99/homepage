'use client';

import { motion, useTransform } from 'framer-motion';

import type { SongThemeId } from '../songs';

import { useHomeStoryMotion } from './home-motion';
import { getHomeSceneStoryProfile } from './story-profiles';

const RAIN_ENTRY_PATHS = [
  'M74 -90 L260 1090',
  'M226 -120 L374 1080',
  'M396 -80 L468 1080',
  'M596 -110 L542 1090',
  'M764 -80 L640 1080',
  'M930 -120 L744 1090',
] as const;

const FREEWAY_ENTRY_PATHS = [
  'M500 392 L72 1120',
  'M500 392 L302 1120',
  'M500 392 L698 1120',
  'M500 392 L928 1120',
  'M120 392 L880 392',
] as const;

export function HeroEntryStage({ theme }: { theme: SongThemeId }) {
  const { entryProgress, reduceMotion } = useHomeStoryMotion();
  const motif = getHomeSceneStoryProfile(theme).bridge;
  const opensVertically = motif === 'rainfall';
  const panelNegative = useTransform(
    entryProgress,
    [0, 0.1, 0.56, 0.7],
    ['0%', '0%', '-104%', '-104%'],
  );
  const panelPositive = useTransform(
    entryProgress,
    [0, 0.1, 0.56, 0.7],
    ['0%', '0%', '104%', '104%'],
  );
  const panelOpacity = useTransform(entryProgress, [0, 0.54, 0.7], [1, 1, 0]);
  const glowOpacity = useTransform(
    entryProgress,
    [0, 0.12, 0.34, 0.68, 0.78],
    [0.08, 0.24, 0.62, 0.2, 0],
  );
  const glowScale = useTransform(
    entryProgress,
    [0, 0.18, 0.62],
    [0.64, 0.86, 1.28],
  );
  const signalOpacity = useTransform(
    entryProgress,
    [0, 0.1, 0.48, 0.68],
    [0.34, 0.82, 0.48, 0],
  );
  const signalScale = useTransform(entryProgress, [0, 0.48], [0.18, 1]);
  const ringOpacity = useTransform(
    entryProgress,
    [0.08, 0.24, 0.52, 0.72],
    [0.12, 0.52, 0.22, 0],
  );
  const ringScale = useTransform(
    entryProgress,
    [0.08, 0.28, 0.72],
    [0.56, 0.94, 1.42],
  );
  const ringRotate = useTransform(entryProgress, [0.08, 0.72], [-16, 18]);
  const motifOpacity = useTransform(
    entryProgress,
    [0.08, 0.2, 0.54, 0.74],
    [0, 0.74, 0.34, 0],
  );
  const motifPathLength = useTransform(entryProgress, [0.08, 0.5], [0, 1]);
  const motifPathOffset = useTransform(entryProgress, [0.08, 0.5], [0.22, 0]);
  const motifY = useTransform(entryProgress, [0.08, 0.72], [-72, 64]);

  if (reduceMotion) {
    return null;
  }

  const paths = motif === 'rainfall' ? RAIN_ENTRY_PATHS : FREEWAY_ENTRY_PATHS;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-[9] overflow-hidden"
      data-entry-motif={motif}
      data-entry-stage="hero"
    >
      {opensVertically ? (
        <>
          <motion.div
            className="absolute inset-y-0 left-0 w-[calc(50%_+_1px)] bg-[var(--hero-bg)]"
            style={{ opacity: panelOpacity, x: panelNegative }}
          />
          <motion.div
            className="absolute inset-y-0 right-0 w-[calc(50%_+_1px)] bg-[var(--hero-bg)]"
            style={{ opacity: panelOpacity, x: panelPositive }}
          />
        </>
      ) : (
        <>
          <motion.div
            className="absolute inset-x-0 top-0 h-[calc(50%_+_1px)] bg-[var(--hero-bg)]"
            style={{ opacity: panelOpacity, y: panelNegative }}
          />
          <motion.div
            className="absolute inset-x-0 bottom-0 h-[calc(50%_+_1px)] bg-[var(--hero-bg)]"
            style={{ opacity: panelOpacity, y: panelPositive }}
          />
        </>
      )}

      <motion.div
        className="absolute left-1/2 top-1/2 aspect-square w-[min(74vmin,760px)] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[var(--hero-signal)] shadow-[0_0_90px_var(--motion-glow),inset_0_0_70px_var(--motion-glow)]"
        style={{
          opacity: ringOpacity,
          rotate: ringRotate,
          scale: ringScale,
        }}
      />
      <motion.div
        className="absolute left-1/2 top-1/2 aspect-square w-[min(56vmin,580px)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,var(--motion-glow),transparent_68%)] blur-2xl"
        style={{ opacity: glowOpacity, scale: glowScale }}
      />

      <motion.svg
        viewBox="0 0 1000 1120"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 h-full w-full"
        style={{ opacity: motifOpacity, y: motifY }}
      >
        <g
          fill="none"
          stroke="var(--hero-signal)"
          strokeLinecap="round"
          strokeWidth="1.15"
          vectorEffect="non-scaling-stroke"
        >
          {paths.map((path, index) => (
            <motion.path
              key={path}
              d={path}
              pathLength="1"
              strokeOpacity={0.34 + (index % 3) * 0.16}
              style={{
                pathLength: motifPathLength,
                pathOffset: motifPathOffset,
              }}
            />
          ))}
        </g>
      </motion.svg>

      <motion.div
        className={
          opensVertically
            ? 'absolute inset-y-[8%] left-1/2 w-px -translate-x-1/2 bg-[linear-gradient(to_bottom,transparent,var(--hero-signal),transparent)] shadow-[0_0_22px_var(--hero-signal)]'
            : 'absolute inset-x-[7%] top-1/2 h-px -translate-y-1/2 bg-[linear-gradient(to_right,transparent,var(--hero-signal),transparent)] shadow-[0_0_22px_var(--hero-signal)]'
        }
        style={{
          opacity: signalOpacity,
          ...(opensVertically
            ? { scaleY: signalScale }
            : { scaleX: signalScale }),
        }}
      />
    </div>
  );
}

'use client';

import {
  createContext,
  type AriaAttributes,
  type CSSProperties,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  animate,
  type MotionValue,
  type MotionStyle,
  motion,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from 'framer-motion';

import { cn } from '@/lib/utils';

import type { SongThemeId } from '../songs';

import {
  DEPTH_ENTRY_PRESETS,
  HOME_ENTRY_CUES,
  HOME_ENTRY_DURATION,
  HOME_ENTRY_REVEALS,
  HOME_MOTION_SPRING,
  type HomeEntryCue,
  type HomeEntryReveal,
  STORY_PARALLAX_PRESETS,
  STORY_PARALLAX_STOPS,
} from './motion-tokens';
import { SceneStoryBridge } from './story-bridge';

type DepthPreset = keyof typeof DEPTH_ENTRY_PRESETS;
type SectionDepthVariant = 'hero' | 'atlas';
type StoryParallaxLayer = keyof typeof STORY_PARALLAX_PRESETS;

interface HomeMotionContextValue {
  atlasProgress: MotionValue<number>;
  entryProgress: MotionValue<number>;
  heroProgress: MotionValue<number>;
  notifySceneReady: () => void;
  reduceMotion: boolean;
}

const HomeMotionContext = createContext<HomeMotionContextValue | null>(null);

export function useHomeStoryMotion() {
  const context = useContext(HomeMotionContext);
  if (!context) {
    throw new Error('useHomeStoryMotion must be used within HomeMotionRoot');
  }
  return context;
}

export function HomeMotionRoot({
  children,
  theme,
}: {
  children: ReactNode;
  theme: SongThemeId;
}) {
  const reduceMotion = Boolean(useReducedMotion());
  const heroProgress = useMotionValue(0);
  const atlasProgress = useMotionValue(0);
  const entryProgress = useMotionValue(reduceMotion ? 1 : 0);
  const entryHasStarted = useRef(false);
  const [sceneReady, setSceneReady] = useState(false);
  const notifySceneReady = useCallback(() => setSceneReady(true), []);

  useEffect(() => {
    if (reduceMotion || sceneReady) {
      return;
    }

    const fallbackTimer = window.setTimeout(() => setSceneReady(true), 1_200);
    return () => window.clearTimeout(fallbackTimer);
  }, [reduceMotion, sceneReady]);

  useEffect(() => {
    if (reduceMotion) {
      entryHasStarted.current = true;
      entryProgress.set(1);
      return;
    }
    if (!sceneReady || entryHasStarted.current) {
      return;
    }

    entryHasStarted.current = true;
    entryProgress.set(0);
    const controls = animate(entryProgress, 1, {
      duration: HOME_ENTRY_DURATION,
      ease: 'linear',
    });
    return () => controls.stop();
  }, [entryProgress, reduceMotion, sceneReady]);

  const contextValue = useMemo(
    () => ({
      atlasProgress,
      entryProgress,
      heroProgress,
      notifySceneReady,
      reduceMotion,
    }),
    [
      atlasProgress,
      entryProgress,
      heroProgress,
      notifySceneReady,
      reduceMotion,
    ],
  );

  return (
    <HomeMotionContext.Provider value={contextValue}>
      <div
        className="relative isolate [perspective-origin:50%_38svh] [perspective:1600px]"
        data-motion={reduceMotion ? 'reduced' : 'full'}
        data-scene-ready={sceneReady ? 'true' : 'false'}
        data-story-theme={theme}
      >
        {!reduceMotion && (
          <SceneStoryBridge progress={heroProgress} theme={theme} />
        )}
        <div className="relative z-10 [transform-style:preserve-3d]">
          {children}
        </div>
      </div>
    </HomeMotionContext.Provider>
  );
}

export function ScrollDepthSection({
  children,
  variant,
}: {
  children: ReactNode;
  variant: SectionDepthVariant;
}) {
  const { atlasProgress, entryProgress, heroProgress, reduceMotion } =
    useHomeStoryMotion();
  const sectionRef = useRef<HTMLDivElement>(null);
  const offset: ['start start', 'end start'] | ['start 92%', 'start 40%'] =
    variant === 'hero'
      ? ['start start', 'end start']
      : ['start 92%', 'start 40%'];
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset,
  });
  const progress = useSpring(scrollYProgress, HOME_MOTION_SPRING);
  const sharedProgress = variant === 'hero' ? heroProgress : atlasProgress;

  useMotionValueEvent(progress, 'change', (value) => {
    sharedProgress.set(value);
  });

  useEffect(() => {
    sharedProgress.set(progress.get());
  }, [progress, sharedProgress]);

  const rotateX = useTransform(
    progress,
    variant === 'hero' ? [0, 0.42, 0.76, 1] : [0, 0.46, 1],
    variant === 'hero' ? [0, 0, 4, 14] : [18, 8, 0],
  );
  const y = useTransform(
    progress,
    variant === 'hero' ? [0, 0.44, 0.78, 1] : [0, 0.48, 1],
    variant === 'hero' ? [0, 0, 58, 176] : [148, 52, 0],
  );
  const z = useTransform(
    progress,
    variant === 'hero' ? [0, 0.44, 0.78, 1] : [0, 0.46, 1],
    variant === 'hero' ? [0, 0, -88, -280] : [-260, -82, 0],
  );
  const scale = useTransform(
    progress,
    variant === 'hero' ? [0, 0.44, 0.8, 1] : [0, 0.5, 1],
    variant === 'hero' ? [1, 1, 0.96, 0.89] : [0.9, 0.97, 1],
  );
  const opacity = useTransform(
    progress,
    variant === 'hero' ? [0, 0.48, 0.82, 1] : [0, 0.42, 1],
    variant === 'hero' ? [1, 1, 0.86, 0.12] : [0.16, 0.72, 1],
  );
  const clipPath = useTransform(
    progress,
    [0, 0.52, 1],
    [
      'inset(10% 4% 12% 4% round 36px)',
      'inset(3% 1.5% 4% 1.5% round 18px)',
      'inset(0% 0% 0% 0% round 0px)',
    ],
  );
  const entryScale = useTransform(
    entryProgress,
    [0, 0.18, 0.52, 1],
    [0.975, 0.99, 1.004, 1],
  );
  const entryZ = useTransform(
    entryProgress,
    [0, 0.2, 0.58, 1],
    [-160, -64, 10, 0],
  );
  const entryRotateX = useTransform(
    entryProgress,
    [0, 0.2, 0.58, 1],
    [5, 2, -0.35, 0],
  );
  const entryFilter = useTransform(
    entryProgress,
    [0, 0.2, 0.56, 1],
    ['blur(3px)', 'blur(1px)', 'blur(0px)', 'blur(0px)'],
  );

  const scrollStyle = reduceMotion
    ? undefined
    : {
        rotateX,
        y,
        z,
        scale,
        opacity,
        transformOrigin: variant === 'hero' ? '50% 100%' : '50% 0%',
        willChange: 'transform, opacity',
        ...(variant === 'atlas' ? { clipPath } : {}),
      };

  return (
    <motion.div
      ref={sectionRef}
      className={
        variant === 'atlas'
          ? 'relative h-[100svh] min-h-[560px] [transform-style:preserve-3d] lg:h-auto lg:min-h-screen'
          : 'relative [transform-style:preserve-3d]'
      }
      style={scrollStyle}
      data-depth-section={variant}
    >
      <motion.div
        className={
          variant === 'atlas'
            ? 'h-full min-h-0 [transform-style:preserve-3d] lg:h-auto'
            : '[transform-style:preserve-3d]'
        }
        style={
          reduceMotion || variant !== 'hero'
            ? undefined
            : {
                filter: entryFilter,
                rotateX: entryRotateX,
                scale: entryScale,
                transformOrigin: '50% 42%',
                willChange: 'filter, opacity, transform',
                z: entryZ,
              }
        }
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

export interface StoryParallaxProps {
  children: ReactNode;
  as?: 'div' | 'span';
  className?: string;
  layer?: StoryParallaxLayer;
  style?: CSSProperties;
}

export function StoryParallax({
  children,
  as = 'div',
  className,
  layer = 'middle',
  style,
}: StoryParallaxProps) {
  const { heroProgress, reduceMotion } = useHomeStoryMotion();
  const preset = STORY_PARALLAX_PRESETS[layer];
  const y = useTransform(heroProgress, STORY_PARALLAX_STOPS, preset.y);
  const z = useTransform(heroProgress, STORY_PARALLAX_STOPS, preset.z);
  const scale = useTransform(heroProgress, STORY_PARALLAX_STOPS, preset.scale);
  const rotateX = useTransform(
    heroProgress,
    STORY_PARALLAX_STOPS,
    preset.rotateX,
  );
  const parallaxStyle: MotionStyle | undefined = reduceMotion
    ? style
    : {
        ...style,
        rotateX,
        scale,
        y,
        z,
        transformStyle: 'preserve-3d',
        willChange: 'transform',
      };

  if (as === 'span') {
    return (
      <motion.span className={className} style={parallaxStyle}>
        {children}
      </motion.span>
    );
  }

  return (
    <motion.div className={className} style={parallaxStyle}>
      {children}
    </motion.div>
  );
}

export interface DepthEntranceProps {
  children: ReactNode;
  as?: 'div' | 'span';
  cue?: HomeEntryCue;
  depth?: DepthPreset;
  reveal?: HomeEntryReveal;
  className?: string;
  style?: CSSProperties;
  'aria-hidden'?: AriaAttributes['aria-hidden'];
}

export function DepthEntrance({
  children,
  as = 'div',
  cue = 'titlePrimary',
  depth = 'surface',
  reveal = 'none',
  className,
  style,
  'aria-hidden': ariaHidden,
}: DepthEntranceProps) {
  const { entryProgress, reduceMotion } = useHomeStoryMotion();
  const preset = DEPTH_ENTRY_PRESETS[depth];
  const [start, end] = HOME_ENTRY_CUES[cue];
  const span = end - start;
  const entranceStops = [start, start + span * 0.62, start + span * 0.88, end];
  const settleY = preset.y < 0 ? 2.5 : -2.5;
  const opacity = useTransform(entryProgress, entranceStops, [
    preset.opacity,
    0.86,
    1,
    1,
  ]);
  const y = useTransform(entryProgress, entranceStops, [
    preset.y,
    preset.y * 0.14,
    settleY,
    0,
  ]);
  const z = useTransform(entryProgress, entranceStops, [
    preset.z,
    preset.z * 0.12,
    18,
    0,
  ]);
  const scale = useTransform(entryProgress, entranceStops, [
    preset.scale,
    0.992,
    1.018,
    1,
  ]);
  const rotateX = useTransform(entryProgress, entranceStops, [
    preset.rotateX,
    preset.rotateX * 0.12,
    -0.8,
    0,
  ]);
  const filter = useTransform(entryProgress, entranceStops, [
    preset.filter,
    'blur(2px)',
    'blur(0px)',
    'blur(0px)',
  ]);
  const clipPath = useTransform(
    entryProgress,
    [start, start + span * 0.82, end],
    [
      HOME_ENTRY_REVEALS[reveal][0],
      HOME_ENTRY_REVEALS[reveal][1],
      HOME_ENTRY_REVEALS[reveal][1],
    ],
  );
  const entranceStyle: MotionStyle | undefined = reduceMotion
    ? style
    : {
        ...style,
        clipPath,
        filter,
        opacity,
        rotateX,
        scale,
        transformStyle: 'preserve-3d',
        willChange: 'clip-path, filter, opacity, transform',
        y,
        z,
      };
  const motionProps = {
    className: cn(as === 'span' && 'inline-block', className),
    style: entranceStyle,
    'aria-hidden': ariaHidden,
  } as const;

  if (as === 'span') {
    return <motion.span {...motionProps}>{children}</motion.span>;
  }

  return <motion.div {...motionProps}>{children}</motion.div>;
}

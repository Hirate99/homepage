'use client';

import {
  createContext,
  type AriaAttributes,
  type CSSProperties,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from 'react';

import {
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

import type { SongThemeId } from '../songs';

import {
  DEPTH_ENTRY_PRESETS,
  HOME_ENTRY_TRANSITION,
  HOME_MOTION_EASE,
  HOME_MOTION_SPRING,
  STORY_PARALLAX_PRESETS,
  STORY_PARALLAX_STOPS,
} from './motion-tokens';
import { SceneStoryBridge } from './story-bridge';

type DepthPreset = keyof typeof DEPTH_ENTRY_PRESETS;
type SectionDepthVariant = 'hero' | 'atlas';
type StoryParallaxLayer = keyof typeof STORY_PARALLAX_PRESETS;

interface HomeMotionContextValue {
  atlasProgress: MotionValue<number>;
  heroProgress: MotionValue<number>;
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
  const contextValue = useMemo(
    () => ({
      atlasProgress,
      heroProgress,
      reduceMotion,
    }),
    [atlasProgress, heroProgress, reduceMotion],
  );

  return (
    <HomeMotionContext.Provider value={contextValue}>
      <div
        className="relative isolate [perspective-origin:50%_38svh] [perspective:1600px]"
        data-motion={reduceMotion ? 'reduced' : 'full'}
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
  const { atlasProgress, heroProgress, reduceMotion } = useHomeStoryMotion();
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
          ? 'relative min-h-[720px] [transform-style:preserve-3d] lg:min-h-screen'
          : 'relative [transform-style:preserve-3d]'
      }
      style={scrollStyle}
      data-depth-section={variant}
    >
      <motion.div
        className="[transform-style:preserve-3d]"
        initial={
          reduceMotion || variant !== 'hero'
            ? false
            : {
                opacity: 0,
                scale: 0.975,
                rotateX: 6,
                z: -120,
              }
        }
        animate={{ opacity: 1, scale: 1, rotateX: 0, z: 0 }}
        transition={HOME_ENTRY_TRANSITION}
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
  depth?: DepthPreset;
  delay?: number;
  className?: string;
  style?: CSSProperties;
  'aria-hidden'?: AriaAttributes['aria-hidden'];
}

export function DepthEntrance({
  children,
  as = 'div',
  depth = 'surface',
  delay = 0,
  className,
  style,
  'aria-hidden': ariaHidden,
}: DepthEntranceProps) {
  const { reduceMotion } = useHomeStoryMotion();
  const motionProps = {
    className,
    style,
    initial: reduceMotion ? false : DEPTH_ENTRY_PRESETS[depth],
    animate: {
      opacity: 1,
      y: 0,
      z: 0,
      rotateX: 0,
      filter: 'blur(0px)',
    },
    transition: {
      duration: 0.9,
      delay,
      ease: HOME_MOTION_EASE,
    },
    'aria-hidden': ariaHidden,
  } as const;

  if (as === 'span') {
    return <motion.span {...motionProps}>{children}</motion.span>;
  }

  return <motion.div {...motionProps}>{children}</motion.div>;
}

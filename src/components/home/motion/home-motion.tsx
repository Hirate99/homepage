'use client';

import {
  createContext,
  type AriaAttributes,
  type CSSProperties,
  type ReactNode,
  useContext,
  useRef,
} from 'react';

import {
  motion,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from 'framer-motion';

import {
  DEPTH_ENTRY_PRESETS,
  HOME_ENTRY_TRANSITION,
  HOME_MOTION_EASE,
  HOME_MOTION_SPRING,
} from './motion-tokens';

type DepthPreset = keyof typeof DEPTH_ENTRY_PRESETS;
type SectionDepthVariant = 'hero' | 'atlas';

const HomeMotionContext = createContext({ reduceMotion: false });

export function HomeMotionRoot({ children }: { children: ReactNode }) {
  const reduceMotion = Boolean(useReducedMotion());
  const { scrollYProgress } = useScroll();
  const smoothProgress = useSpring(scrollYProgress, HOME_MOTION_SPRING);

  return (
    <HomeMotionContext.Provider value={{ reduceMotion }}>
      <div
        className="relative isolate [perspective-origin:50%_38svh] [perspective:1600px]"
        data-motion={reduceMotion ? 'reduced' : 'full'}
      >
        {!reduceMotion && <AmbientDepthField progress={smoothProgress} />}
        <div className="relative z-10 [transform-style:preserve-3d]">
          {children}
        </div>
      </div>
    </HomeMotionContext.Provider>
  );
}

function AmbientDepthField({
  progress,
}: {
  progress: ReturnType<typeof useSpring>;
}) {
  const orbitRotation = useTransform(progress, [0, 1], [8, 210]);
  const orbitY = useTransform(progress, [0, 1], [-80, 260]);
  const railRotation = useTransform(progress, [0, 1], [-9, 16]);
  const railY = useTransform(progress, [0, 1], [120, -180]);

  return (
    <div
      className="pointer-events-none fixed inset-0 z-20 overflow-hidden"
      aria-hidden="true"
    >
      <motion.div
        className="absolute -right-[19rem] top-[7svh] h-[34rem] w-[34rem] rounded-full border border-[var(--motion-accent)] opacity-[0.12] [box-shadow:0_0_80px_var(--motion-glow),inset_0_0_80px_var(--motion-glow)] [transform-style:preserve-3d]"
        style={{
          y: orbitY,
          rotateX: 72,
          rotateY: 12,
          rotateZ: orbitRotation,
        }}
      >
        <div className="absolute inset-[18%] rounded-full border border-[var(--motion-accent)]" />
        <div className="absolute inset-[38%] rounded-full border border-[var(--motion-accent)]" />
        <div className="absolute left-1/2 top-0 h-full w-px bg-[var(--motion-accent)]" />
        <div className="absolute left-0 top-1/2 h-px w-full bg-[var(--motion-accent)]" />
      </motion.div>

      <motion.div
        className="absolute -left-28 top-[46svh] h-[42svh] w-52 border-y border-[var(--motion-accent)] opacity-[0.1] [background:repeating-linear-gradient(90deg,var(--motion-accent)_0_1px,transparent_1px_34px)] [mask-image:linear-gradient(to_right,transparent,black_55%,transparent)]"
        style={{
          y: railY,
          rotateY: 64,
          rotateZ: railRotation,
        }}
      />
    </div>
  );
}

export function ScrollDepthSection({
  children,
  variant,
}: {
  children: ReactNode;
  variant: SectionDepthVariant;
}) {
  const { reduceMotion } = useContext(HomeMotionContext);
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

  const rotateX = useTransform(
    progress,
    [0, 1],
    variant === 'hero' ? [0, 10] : [11, 0],
  );
  const y = useTransform(
    progress,
    [0, 1],
    variant === 'hero' ? [0, 112] : [96, 0],
  );
  const z = useTransform(
    progress,
    [0, 1],
    variant === 'hero' ? [0, -180] : [-150, 0],
  );
  const scale = useTransform(
    progress,
    [0, 1],
    variant === 'hero' ? [1, 0.94] : [0.955, 1],
  );
  const opacity = useTransform(
    progress,
    [0, 1],
    variant === 'hero' ? [1, 0.78] : [0.64, 1],
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
      };

  return (
    <motion.div
      ref={sectionRef}
      className="relative [transform-style:preserve-3d]"
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
  const { reduceMotion } = useContext(HomeMotionContext);
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

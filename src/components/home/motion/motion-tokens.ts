export const HOME_MOTION_EASE = [0.16, 1, 0.3, 1] as const;

export const HOME_MOTION_SPRING = {
  stiffness: 150,
  damping: 30,
  mass: 0.28,
} as const;

export const HOME_ENTRY_TRANSITION = {
  duration: 1.15,
  ease: HOME_MOTION_EASE,
} as const;

export const STORY_PARALLAX_STOPS = [0, 0.42, 0.76, 1];

export const STORY_PARALLAX_PRESETS = {
  far: {
    y: [0, -8, -34, -72],
    z: [0, -24, -100, -180],
    scale: [1, 1, 0.985, 0.95],
    rotateX: [0, 0, 1.5, 4],
  },
  middle: {
    y: [0, -18, -76, -154],
    z: [0, 14, -28, -94],
    scale: [1, 1.008, 0.99, 0.94],
    rotateX: [0, -0.4, 2.5, 7],
  },
  near: {
    y: [0, -30, -128, -246],
    z: [0, 58, 72, 12],
    scale: [1, 1.016, 1.02, 0.96],
    rotateX: [0, -1.2, 4, 10],
  },
};

export const DEPTH_ENTRY_PRESETS = {
  back: {
    opacity: 0,
    y: 34,
    z: -180,
    rotateX: 12,
    filter: 'blur(8px)',
  },
  surface: {
    opacity: 0,
    y: 24,
    z: -90,
    rotateX: 7,
    filter: 'blur(5px)',
  },
  front: {
    opacity: 0,
    y: -18,
    z: 90,
    rotateX: -6,
    filter: 'blur(4px)',
  },
} as const;

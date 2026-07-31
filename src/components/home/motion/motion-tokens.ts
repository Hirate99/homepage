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

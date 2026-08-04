export const HOME_MOTION_SPRING = {
  stiffness: 150,
  damping: 30,
  mass: 0.28,
} as const;

export const HOME_ENTRY_DURATION = 2.35;

export const HOME_ENTRY_CUES = {
  greeting: [0.3, 0.57],
  titlePrimary: [0.4, 0.72],
  titleSecondary: [0.5, 0.81],
  soundtrack: [0.58, 0.86],
  navigation: [0.66, 0.93],
  footer: [0.74, 1],
} as const;

export type HomeEntryCue = keyof typeof HOME_ENTRY_CUES;

export const HOME_ENTRY_REVEALS = {
  none: ['inset(0% 0% 0% 0%)', 'inset(0% 0% 0% 0%)'],
  up: ['inset(100% 0% 0% 0%)', 'inset(0% 0% 0% 0%)'],
  down: ['inset(0% 0% 100% 0%)', 'inset(0% 0% 0% 0%)'],
  left: ['inset(0% 100% 0% 0%)', 'inset(0% 0% 0% 0%)'],
} as const;

export type HomeEntryReveal = keyof typeof HOME_ENTRY_REVEALS;

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
    y: 48,
    z: -220,
    scale: 0.91,
    rotateX: 12,
    filter: 'blur(11px)',
  },
  surface: {
    opacity: 0,
    y: 36,
    z: -120,
    scale: 0.955,
    rotateX: 8,
    filter: 'blur(7px)',
  },
  front: {
    opacity: 0,
    y: -28,
    z: 140,
    scale: 1.045,
    rotateX: -7,
    filter: 'blur(5px)',
  },
} as const;

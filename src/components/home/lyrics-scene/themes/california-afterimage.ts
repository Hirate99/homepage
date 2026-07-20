import { createCaliforniaAfterimageEnvironment } from '../environments/california-afterimage';
import { CALIFORNIA_BRIDGE } from '../environments/california-afterimage/geometry';

import type { SongSceneTheme } from './types';

interface AirPlacement {
  color: number;
  opacity: number;
  rotation: number;
  rotationY: number;
  size: number;
  x: number;
  y: number;
  z: number;
}

interface ProjectionPlacement {
  color: number;
  heading: number;
  lift: number;
  opacity: number;
  size: number;
  tilt: number;
  x: number;
  z: number;
}

const AirLyrics: Record<string, AirPlacement> = {
  waiting: {
    x: 2.25,
    y: 2.76,
    z: -0.5,
    rotation: -0.024,
    rotationY: -0.05,
    size: 0.64,
    opacity: 0.92,
    color: 0,
  },
  chasing: {
    x: -0.15,
    y: 1.48,
    z: -0.92,
    rotation: 0.018,
    rotationY: 0.05,
    size: 0.56,
    opacity: 0.8,
    color: 3,
  },
  'voice-origin': {
    x: -1.65,
    y: 0.96,
    z: -0.95,
    rotation: -0.018,
    rotationY: 0.06,
    size: 0.51,
    opacity: 0.78,
    color: 2,
  },
  'voice-fades': {
    x: 1.78,
    y: 0.5,
    z: -1.14,
    rotation: 0.016,
    rotationY: -0.07,
    size: 0.51,
    opacity: 0.74,
    color: 3,
  },
  'blue-deep-orange-day': {
    x: 0.42,
    y: -0.34,
    z: -0.72,
    rotation: -0.01,
    rotationY: 0,
    size: 0.72,
    opacity: 0.94,
    color: 0,
  },
  'beside-you': {
    x: -1.22,
    y: -1.12,
    z: -0.96,
    rotation: 0.016,
    rotationY: 0.04,
    size: 0.49,
    opacity: 0.72,
    color: 2,
  },
  'without-color': {
    x: 0.28,
    y: 0.56,
    z: -1,
    rotation: 0.012,
    rotationY: 0,
    size: 0.58,
    opacity: 0.82,
    color: 3,
  },
};

// Three shallow, camera-facing projection slots form a readable corridor down
// the bridge. The mascot uses a separate set of curated screen-safe waypoints.
const ProjectionLyrics: Record<string, ProjectionPlacement> = {
  'receding-days': {
    x: -0.28,
    z: -5.3,
    lift: 0.42,
    tilt: -0.82,
    heading: -0.035,
    size: 0.62,
    opacity: 0.9,
    color: 2,
  },
  'far-away': {
    x: 0.32,
    z: -6.9,
    lift: 0.48,
    tilt: -0.76,
    heading: 0.035,
    size: 0.58,
    opacity: 0.82,
    color: 2,
  },
  yearning: {
    x: -0.42,
    z: -5.35,
    lift: 0.42,
    tilt: -0.82,
    heading: -0.04,
    size: 0.61,
    opacity: 0.92,
    color: 0,
  },
  embrace: {
    x: 0.58,
    z: -7.7,
    lift: 0.5,
    tilt: -0.73,
    heading: 0.045,
    size: 0.57,
    opacity: 0.86,
    color: 2,
  },
  broken: {
    x: -0.08,
    z: -9.75,
    lift: 0.57,
    tilt: -0.64,
    heading: -0.015,
    size: 0.56,
    opacity: 0.82,
    color: 0,
  },
  'love-and-sorrow': {
    x: 0.5,
    z: -5.35,
    lift: 0.42,
    tilt: -0.82,
    heading: 0.04,
    size: 0.59,
    opacity: 0.88,
    color: 2,
  },
  'burned-by-longing': {
    x: -0.54,
    z: -7.65,
    lift: 0.5,
    tilt: -0.73,
    heading: -0.045,
    size: 0.57,
    opacity: 0.86,
    color: 1,
  },
  'question-that-day': {
    x: 0.36,
    z: -9.7,
    lift: 0.57,
    tilt: -0.64,
    heading: 0.03,
    size: 0.55,
    opacity: 0.8,
    color: 2,
  },
  'continues-forever': {
    x: -0.4,
    z: -5.4,
    lift: 0.42,
    tilt: -0.82,
    heading: -0.035,
    size: 0.59,
    opacity: 0.88,
    color: 3,
  },
  'still-waiting': {
    x: 0.52,
    z: -7.7,
    lift: 0.5,
    tilt: -0.73,
    heading: 0.04,
    size: 0.57,
    opacity: 0.84,
    color: 2,
  },
  'walking-alone': {
    x: -0.32,
    z: -9.75,
    lift: 0.57,
    tilt: -0.64,
    heading: -0.025,
    size: 0.56,
    opacity: 0.8,
    color: 2,
  },
  'rusted-walkway': {
    x: 0.12,
    z: -6.65,
    lift: 0.47,
    tilt: -0.77,
    heading: 0.012,
    size: 0.59,
    opacity: 0.86,
    color: 2,
  },
};

const CueSequence: Record<string, number> = {
  waiting: 0,
  chasing: 0,
  'receding-days': 0,
  'voice-origin': 1,
  'voice-fades': 1,
  'far-away': 1,
  yearning: 2,
  embrace: 2,
  broken: 2,
  'love-and-sorrow': 3,
  'burned-by-longing': 3,
  'question-that-day': 3,
  'continues-forever': 4,
  'still-waiting': 4,
  'walking-alone': 4,
  'rusted-walkway': 5,
  'blue-deep-orange-day': 5,
  'beside-you': 5,
  'without-color': 6,
};

const CueRevealOrder: Record<string, number> = {
  waiting: 0,
  chasing: 1,
  'receding-days': 2,
  'voice-origin': 0,
  'voice-fades': 1,
  'far-away': 2,
  yearning: 0,
  embrace: 1,
  broken: 2,
  'love-and-sorrow': 0,
  'burned-by-longing': 1,
  'question-that-day': 2,
  'continues-forever': 0,
  'still-waiting': 1,
  'walking-alone': 2,
  'rusted-walkway': 0,
  'blue-deep-orange-day': 1,
  'beside-you': 2,
  'without-color': 0,
};

const SEQUENCE_STEPS = 7;

export const CaliforniaAfterimageTheme: SongSceneTheme = {
  id: 'california-afterimage',
  atmosphere: 'california',
  textWaveAxis: 'horizontal',
  createEnvironment: (song) =>
    createCaliforniaAfterimageEnvironment(song.colors),
  fog: { near: 17, far: 44 },
  createLayout: (song, cues) =>
    cues.map((cue, index) => {
      const sequence = CueSequence[cue.id];
      const revealOrder = CueRevealOrder[cue.id] ?? 0;
      const air = AirLyrics[cue.id];
      if (air) {
        return {
          x: air.x,
          y: air.y,
          z: air.z,
          rotation: air.rotation,
          rotationX: -0.015,
          rotationY: air.rotationY,
          size: air.size,
          color: song.colors.lyrics[air.color % song.colors.lyrics.length],
          opacity: air.opacity,
          writingMode: 'horizontal' as const,
          surface: 'air' as const,
          sequence,
          revealOrder,
        };
      }

      const projection = ProjectionLyrics[cue.id] ?? {
        x: ((index % 3) - 1) * 0.42,
        z: -6.2 - (index % 3) * 2.6,
        lift: 0.46,
        tilt: -0.76,
        heading: 0,
        size: 0.48,
        opacity: 0.76,
        color: 2,
      };
      return {
        x: projection.x + CALIFORNIA_BRIDGE.centerX,
        y: CALIFORNIA_BRIDGE.surfaceY + projection.lift,
        z: projection.z,
        rotation: 0,
        rotationX: projection.tilt,
        rotationY: projection.heading,
        size: projection.size,
        color: song.colors.lyrics[projection.color % song.colors.lyrics.length],
        opacity: projection.opacity,
        writingMode: 'horizontal' as const,
        surface: 'ground' as const,
        sequence,
        revealOrder,
      };
    }),
  compact: {
    groupScale: 0.9,
    textScale: 1.08,
    minimumOpacity: 0.84,
  },
  entrance: { x: 0.26, y: 0.18, z: 1.4 },
  ripple: { radius: 0, scaleX: 1, scaleY: 1, opacity: 0 },
  ambientSurfaceRipples: false,
  activationDuration: 0,
  interaction: {
    activation: 'none',
    effect: 'none',
    hoverEffect: 'opacity',
  },
  motion: {
    floatX: 0.018,
    floatY: 0.022,
    floatSpeed: 0.00038,
    wavePush: 0,
  },
  lyricReveal: {
    duration: 0.2,
    glowColor: '#fff0c8',
    stagger: 0.105,
    style: 'scan',
  },
  sequence: {
    steps: SEQUENCE_STEPS,
    duration: 31_500,
  },
};

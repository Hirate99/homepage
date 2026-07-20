import { createRainNightEnvironment } from '../environments/rain-night';

import type { SongSceneTheme } from './types';

interface AirPlacement {
  x: number;
  y: number;
  z: number;
  rotation: number;
  rotationX: number;
  rotationY: number;
  size: number;
  opacity: number;
  color: number;
}

interface GroundPlacement {
  x: number;
  z: number;
  heading: number;
  size: number;
  opacity: number;
  color: number;
}

const AirLyrics: Record<string, AirPlacement> = {
  君の生活のことをおもう: {
    x: -0.55,
    y: 3.15,
    z: -0.45,
    rotation: -0.018,
    rotationX: -0.025,
    rotationY: 0.05,
    size: 0.64,
    opacity: 0.88,
    color: 0,
  },
  雨のにおいがする: {
    x: 2.35,
    y: 2.38,
    z: -0.82,
    rotation: 0.018,
    rotationX: -0.025,
    rotationY: -0.02,
    size: 0.62,
    opacity: 0.82,
    color: 1,
  },
  窓から見える: {
    x: 2.7,
    y: 1.28,
    z: -1.25,
    rotation: -0.024,
    rotationX: -0.025,
    rotationY: -0.08,
    size: 0.63,
    opacity: 0.8,
    color: 4,
  },
};

const GroundLyrics: Record<string, GroundPlacement> = {
  // The first verse sits between the dark room edge and reflected window light.
  体温はずっと下がらないまま: {
    x: -6.35,
    z: -15.9,
    heading: -0.38,
    size: 0.52,
    opacity: 0.55,
    color: 4,
  },
  部屋にこもってる: {
    x: -4.15,
    z: -13.25,
    heading: -0.38,
    size: 0.5,
    opacity: 0.45,
    color: 2,
  },
  光が揺れてる: {
    x: 3.85,
    z: -11.8,
    heading: -0.22,
    size: 0.78,
    opacity: 0.86,
    color: 3,
  },
  '雨、雨': {
    x: 0,
    z: -13.35,
    heading: 0,
    size: 1.98,
    opacity: 1,
    color: 0,
  },

  // The second verse runs toward the station and follows the train's direction.
  君がくれたCDを聴く: {
    x: -3.05,
    z: -9.75,
    heading: 0.38,
    size: 0.68,
    opacity: 0.84,
    color: 2,
  },
  何度も繰り返す: {
    x: -5.15,
    z: -8.85,
    heading: 0.38,
    size: 0.46,
    opacity: 0.4,
    color: 1,
  },
  スピードはずっと変わらない: {
    x: 3.65,
    z: -9.55,
    heading: -0.22,
    size: 0.55,
    opacity: 0.55,
    color: 1,
  },
  まだ部屋にこもってる: {
    x: -5.65,
    z: -12.05,
    heading: 0.38,
    size: 0.44,
    opacity: 0.38,
    color: 2,
  },
  夜だけ見える: {
    x: 4.7,
    z: -14.15,
    heading: 0.76,
    size: 0.54,
    opacity: 0.52,
    color: 4,
  },
  雨: {
    x: 0.2,
    z: -14.85,
    heading: 0,
    size: 0.7,
    opacity: 0.45,
    color: 1,
  },

  // The farewell forms two readable rows along the far edge of the crossing.
  できれば: {
    x: -7,
    z: -15.5,
    heading: -0.32,
    size: 0.65,
    opacity: 0.8,
    color: 3,
  },
  このまま: {
    x: -3.8,
    z: -16.5,
    heading: -0.18,
    size: 0.58,
    opacity: 0.65,
    color: 0,
  },
  わたしに: {
    x: -0.7,
    z: -17.3,
    heading: -0.05,
    size: 0.58,
    opacity: 0.6,
    color: 2,
  },
  きづかないで: {
    x: 3,
    z: -16.7,
    heading: 0.1,
    size: 0.55,
    opacity: 0.6,
    color: 1,
  },
  それでは: {
    x: 3.8,
    z: -16.5,
    heading: 0.24,
    size: 0.56,
    opacity: 0.55,
    color: 4,
  },
  またどこかで: {
    x: -5.3,
    z: -14.2,
    heading: -0.3,
    size: 0.52,
    opacity: 0.5,
    color: 1,
  },
  あいましょう: {
    x: 0,
    z: -17.2,
    heading: 0,
    size: 0.66,
    opacity: 0.62,
    color: 2,
  },
  さようなら: {
    x: 5.3,
    z: -13.8,
    heading: 0.28,
    size: 0.68,
    opacity: 0.7,
    color: 4,
  },
};

const GroundSequences = [
  new Set(['体温はずっと下がらないまま', '部屋にこもってる', '光が揺れてる']),
  new Set([
    '君がくれたCDを聴く',
    '何度も繰り返す',
    'スピードはずっと変わらない',
    'まだ部屋にこもってる',
    '夜だけ見える',
    '雨',
  ]),
  new Set(['できれば', 'このまま', 'わたしに', 'きづかないで']),
  new Set(['それでは', 'またどこかで', 'あいましょう', 'さようなら']),
];

export const RainNightTheme: SongSceneTheme = {
  id: 'rain-night',
  atmosphere: 'rain',
  textWaveAxis: 'vertical',
  createEnvironment: (song) => createRainNightEnvironment(song.colors),
  fog: { near: 16, far: 40 },
  createLayout: (song, cues) => {
    return cues.map((cue, index) => {
      const { text } = cue;
      const air = AirLyrics[text];
      if (air) {
        return {
          x: air.x,
          y: air.y,
          z: air.z,
          rotation: air.rotation,
          rotationX: air.rotationX,
          rotationY: air.rotationY,
          size: air.size,
          color: song.colors.lyrics[air.color % song.colors.lyrics.length],
          opacity: air.opacity,
          writingMode: 'horizontal' as const,
          surface: 'air' as const,
        };
      }

      const ground = GroundLyrics[text] ?? {
        x: ((index % 5) - 2) * 1.8,
        z: -12 - Math.floor(index / 5) * 1.4,
        heading: 0,
        size: 0.42,
        opacity: 0.24,
        color: index,
      };
      const sequence = GroundSequences.findIndex((items) => items.has(text));

      return {
        x: ground.x,
        y: -3.885 + index * 0.0004,
        z: ground.z,
        rotation: 0,
        rotationX: -Math.PI / 2,
        rotationY: ground.heading,
        size: text === '雨、雨' ? ground.size : ground.size * 1.75,
        color: song.colors.lyrics[ground.color % song.colors.lyrics.length],
        opacity: ground.opacity,
        writingMode: 'horizontal' as const,
        surface: 'ground' as const,
        sequence: sequence >= 0 ? sequence : undefined,
      };
    });
  },
  compact: {
    groupScale: 0.87,
    textScale: 1.12,
    minimumOpacity: 0.82,
  },
  entrance: { x: 0.12, y: 0.68, z: 2.8 },
  ripple: { radius: 5.8, scaleX: 1.2, scaleY: 0.32, opacity: 0.42 },
  ambientSurfaceRipples: true,
  activationDuration: 1_800,
  interaction: {
    activation: 'lyrics',
    effect: 'ripple',
    hoverEffect: 'echo',
  },
  motion: {
    floatX: 0.025,
    floatY: 0.045,
    floatSpeed: 0.00032,
    wavePush: 0.16,
  },
  sequence: {
    steps: GroundSequences.length,
    duration: 16_000,
  },
};

import type { SongSceneTheme } from './types';
import { createHeatTunnelEnvironment } from '../environments/heat-tunnel';

export const HeatTunnelTheme: SongSceneTheme = {
  id: 'heat-tunnel',
  atmosphereMix: 0,
  textWaveAxis: 'horizontal',
  createEnvironment: (song) =>
    createHeatTunnelEnvironment(song.colors.structure),
  fog: { near: 12, far: 28 },
  createLayout: (song, fragments) =>
    fragments.map((_, index) => {
      const angle = index * 1.16 + 0.35;
      const depth = -index * 0.62 - (index % 3) * 0.35;
      const radiusX = 4.35 + Math.sin(index * 0.7) * 0.55;
      const radiusY = 3.25 + Math.cos(index * 0.45) * 0.35;

      return {
        x: Math.cos(angle) * radiusX,
        y: Math.sin(angle) * radiusY,
        z: depth,
        rotation: Math.sin(angle) * 0.08,
        rotationX: -Math.sin(angle) * 0.11,
        rotationY: Math.cos(angle) * 0.24,
        size: 0.72 + (index % 4) * 0.09,
        color: song.colors.lyrics[index % song.colors.lyrics.length],
        opacity: 0.7 - Math.min(index * 0.018, 0.28),
      };
    }),
  compact: {
    groupScale: 0.82,
    textScale: 1.18,
    minimumOpacity: 0.78,
  },
  entrance: { x: 0.38, y: 0.18, z: 2.2 },
  ripple: { radius: 4.8, scaleX: 1, scaleY: 1, opacity: 0.34 },
  motion: {
    floatX: 0.06,
    floatY: 0.1,
    floatSpeed: 0.00055,
    wavePush: 0.28,
  },
};

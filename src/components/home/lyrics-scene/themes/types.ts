import type { SongDefinition, SongThemeId } from '../../songs';

import type { LyricLayout } from '../types';
import type { SceneEnvironment } from '../environments/types';

export interface SongSceneTheme {
  id: SongThemeId;
  atmosphereMix: number;
  textWaveAxis: 'horizontal' | 'vertical';
  createLayout: (song: SongDefinition, fragments: string[]) => LyricLayout[];
  createEnvironment: (song: SongDefinition) => SceneEnvironment;
  fog: { near: number; far: number };
  compact: {
    groupScale: number;
    textScale: number;
    minimumOpacity: number;
  };
  entrance: { x: number; y: number; z: number };
  ripple: {
    radius: number;
    scaleX: number;
    scaleY: number;
    opacity: number;
  };
  motion: {
    floatX: number;
    floatY: number;
    floatSpeed: number;
    wavePush: number;
  };
  sequence?: {
    steps: number;
    duration: number;
  };
}

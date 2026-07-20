import type { SongDefinition, SongLyricCue, SongThemeId } from '../../songs';

import type { LyricLayout } from '../types';
import type { SceneEnvironment } from '../environments/types';

export interface SongSceneTheme {
  id: SongThemeId;
  atmosphere: 'california' | 'rain';
  textWaveAxis: 'horizontal' | 'vertical';
  createLayout: (song: SongDefinition, cues: SongLyricCue[]) => LyricLayout[];
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
  ambientSurfaceRipples: boolean;
  activationDuration: number;
  interaction: {
    activation: 'lyrics' | 'scene' | 'none';
    effect: 'ripple' | 'signal' | 'none';
    hoverEffect: 'echo' | 'opacity';
    signalAxis?: 'depth' | 'horizontal';
  };
  motion: {
    floatX: number;
    floatY: number;
    floatSpeed: number;
    wavePush: number;
  };
  lyricReveal?: {
    duration: number;
    glowColor: string;
    stagger: number;
    style: 'scan';
  };
  sequence?: {
    steps: number;
    duration: number;
  };
}

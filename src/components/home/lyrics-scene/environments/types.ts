import type { Group, Vector2 } from 'three';

export interface EnvironmentFrame {
  time: number;
  entrance: number;
  reducedMotion: boolean;
  pointer: Vector2;
}

export interface SceneEnvironment {
  group: Group;
  lyricSurface?: Group;
  resize: (isCompact: boolean) => void;
  update: (frame: EnvironmentFrame) => void;
  dispose: () => void;
}

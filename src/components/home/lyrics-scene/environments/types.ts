import type { Group, Object3D, Vector2 } from 'three';

export interface LyricActivationFrame {
  index: number;
  age: number;
  progress: number;
}

export interface EnvironmentFrame {
  time: number;
  entrance: number;
  reducedMotion: boolean;
  pointer: Vector2;
  activation: LyricActivationFrame | null;
}

export interface EnvironmentInteractionTarget {
  ariaLabel: string;
  id: string;
  object: Object3D;
  onActivate: () => void;
  onHoverChange: (hovered: boolean) => void;
}

export interface SceneEnvironment {
  group: Group;
  interactions?: readonly EnvironmentInteractionTarget[];
  lyricSurface?: Group;
  resize: (isCompact: boolean) => void;
  update: (frame: EnvironmentFrame) => void;
  dispose: () => void;
}

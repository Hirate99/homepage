import type { Mesh, MeshBasicMaterial, PlaneGeometry } from 'three';

export interface LyricLayout {
  x: number;
  y: number;
  z: number;
  rotation: number;
  rotationX: number;
  rotationY: number;
  size: number;
  color: string;
  opacity: number;
  writingMode?: 'horizontal' | 'vertical';
  surface?: 'air' | 'ground';
  sequence?: number;
  revealOrder?: number;
}

export interface LyricMeshData {
  cueId: string;
  index: number;
  baseX: number;
  baseY: number;
  baseZ: number;
  baseRotation: number;
  baseRotationX: number;
  baseRotationY: number;
  baseOpacity: number;
  phase: number;
  surface: 'air' | 'ground';
  sequence?: number;
  revealOrder?: number;
  visibility: number;
}

export type LyricMesh = Mesh<PlaneGeometry, MeshBasicMaterial> & {
  userData: LyricMeshData;
};

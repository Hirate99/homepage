import {
  BoxGeometry,
  Group,
  Matrix4,
  PlaneGeometry,
  Quaternion,
  Vector3,
} from 'three';

import type { SongColors } from '../../../songs/types';
import type { SceneKit } from '../scene-kit';
import {
  CALIFORNIA_BRIDGE,
  californiaBridgeCenterZ,
  californiaBridgeLength,
  californiaDeckCenterZ,
  californiaDeckLength,
} from './geometry';

const SCREEN_BOTTOM_Y = CALIFORNIA_BRIDGE.surfaceY + 0.12;
const SCREEN_HEIGHT = CALIFORNIA_BRIDGE.screenTopY - SCREEN_BOTTOM_Y;
const SCREEN_CENTER_Y = SCREEN_BOTTOM_Y + SCREEN_HEIGHT / 2;

export function createCaliforniaOverpass(kit: SceneKit, colors: SongColors) {
  const group = new Group();
  kit.group.add(group);

  const concreteMaterial = kit.meshMaterial('#93877a', 0.76, true);
  const walkingSurfaceMaterial = kit.meshMaterial('#cbbda5', 0.9, true);
  const projectionLaneMaterial = kit.meshMaterial('#f4e6cb', 0.16);
  const curbMaterial = kit.meshMaterial('#676867', 0.6, true);
  const structureMaterial = kit.meshMaterial('#716d69', 0.74, true);
  const screenMaterial = kit.meshMaterial('#7fa3a3', 0.045);
  const diagonalMaterial = kit.lineMaterial('#6b7371', 0.16);
  const jointMaterial = kit.lineMaterial('#395b5c', 0.15);
  const shadowMaterial = kit.meshMaterial('#28494a', 0.085);
  const railHighlightMaterial = kit.meshMaterial('#9dc4c1', 0.21);
  const edgeGlowMaterial = kit.meshMaterial(colors.accent, 0.07);
  const sunSweepMaterial = kit.meshMaterial(colors.signal, 0.075);
  const signalSeamMaterial = kit.meshMaterial('#547f80', 0.075);

  kit.addMesh(
    new BoxGeometry(CALIFORNIA_BRIDGE.width, 0.26, californiaDeckLength),
    concreteMaterial,
    [0, CALIFORNIA_BRIDGE.surfaceY - 0.17, californiaDeckCenterZ],
    group,
  );

  const walkingSurface = kit.addMesh(
    new PlaneGeometry(CALIFORNIA_BRIDGE.width - 0.36, californiaDeckLength),
    walkingSurfaceMaterial,
    [0, CALIFORNIA_BRIDGE.surfaceY, californiaDeckCenterZ],
    group,
  );
  walkingSurface.rotation.x = -Math.PI / 2;

  const projectionLane = kit.addMesh(
    new PlaneGeometry(3.25, californiaDeckLength - 0.6),
    projectionLaneMaterial,
    [0, CALIFORNIA_BRIDGE.surfaceY + 0.011, californiaDeckCenterZ],
    group,
  );
  projectionLane.rotation.x = -Math.PI / 2;

  const signalSeam = kit.addMesh(
    new PlaneGeometry(0.028, californiaDeckLength - 0.3),
    signalSeamMaterial,
    [0.92, CALIFORNIA_BRIDGE.surfaceY + 0.016, californiaDeckCenterZ],
    group,
  );
  signalSeam.rotation.x = -Math.PI / 2;

  [-1, 1].forEach((side) => {
    const x = side * (CALIFORNIA_BRIDGE.width / 2 - 0.08);
    kit.addMesh(
      new BoxGeometry(0.17, 0.18, californiaBridgeLength),
      curbMaterial,
      [x, CALIFORNIA_BRIDGE.surfaceY + 0.06, californiaBridgeCenterZ],
      group,
    );
    kit.addMesh(
      new BoxGeometry(0.035, 0.026, californiaBridgeLength - 0.2),
      edgeGlowMaterial,
      [
        x - side * 0.11,
        CALIFORNIA_BRIDGE.surfaceY + 0.17,
        californiaBridgeCenterZ,
      ],
      group,
    );
  });

  for (
    let z = CALIFORNIA_BRIDGE.startZ - 2.2;
    z > CALIFORNIA_BRIDGE.endZ + 1;
    z -= 3.65
  ) {
    kit.addLine(
      [
        new Vector3(
          -CALIFORNIA_BRIDGE.width / 2 + 0.2,
          CALIFORNIA_BRIDGE.surfaceY + 0.012,
          z,
        ),
        new Vector3(
          CALIFORNIA_BRIDGE.width / 2 - 0.2,
          CALIFORNIA_BRIDGE.surfaceY + 0.012,
          z + 0.025,
        ),
      ],
      jointMaterial,
      group,
    );
  }

  [-2.4, -8.8, -15.4].forEach((z, index) => {
    const shadow = kit.addMesh(
      new PlaneGeometry(CALIFORNIA_BRIDGE.width - 0.48, 0.12 + index * 0.025),
      shadowMaterial,
      [0, CALIFORNIA_BRIDGE.surfaceY + 0.018, z],
      group,
    );
    shadow.rotation.set(-Math.PI / 2, 0, -0.38);
  });

  const sunSweep = kit.addMesh(
    new PlaneGeometry(CALIFORNIA_BRIDGE.width - 0.7, 0.065),
    sunSweepMaterial,
    [0, CALIFORNIA_BRIDGE.surfaceY + 0.022, -6.4],
    group,
  );
  sunSweep.rotation.set(-Math.PI / 2, 0, -0.36);

  const postCountPerSide = 15;
  const posts = kit.addInstancedMesh(
    new BoxGeometry(0.055, Math.abs(SCREEN_HEIGHT), 0.055),
    structureMaterial,
    postCountPerSide * 2,
    group,
  );
  const postMatrix = new Matrix4();
  const postPosition = new Vector3();
  const postRotation = new Quaternion();
  const postScale = new Vector3(1, 1, 1);
  const postAxis = new Vector3(0, 0, 1);
  for (let sideIndex = 0; sideIndex < 2; sideIndex += 1) {
    const side = sideIndex === 0 ? -1 : 1;
    for (let index = 0; index < postCountPerSide; index += 1) {
      const progress = index / (postCountPerSide - 1);
      const z = CALIFORNIA_BRIDGE.startZ - progress * californiaBridgeLength;
      postPosition.set(
        side * (CALIFORNIA_BRIDGE.width / 2 - 0.04),
        SCREEN_CENTER_Y,
        z,
      );
      postRotation.setFromAxisAngle(
        postAxis,
        side * (0.088 + (index % 3) * 0.008),
      );
      postMatrix.compose(postPosition, postRotation, postScale);
      posts.setMatrixAt(sideIndex * postCountPerSide + index, postMatrix);
    }
  }
  posts.instanceMatrix.needsUpdate = true;

  [-1, 1].forEach((side) => {
    const x = side * (CALIFORNIA_BRIDGE.width / 2 - 0.04);
    const screen = kit.addMesh(
      new PlaneGeometry(californiaBridgeLength, Math.abs(SCREEN_HEIGHT)),
      screenMaterial,
      [x, SCREEN_CENTER_Y, californiaBridgeCenterZ],
      group,
    );
    screen.rotation.y = Math.PI / 2;

    kit.addMesh(
      new BoxGeometry(0.075, 0.075, californiaBridgeLength),
      structureMaterial,
      [x, CALIFORNIA_BRIDGE.screenTopY, californiaBridgeCenterZ],
      group,
    );
    kit.addMesh(
      new BoxGeometry(0.052, 0.052, californiaBridgeLength),
      railHighlightMaterial,
      [x - side * 0.025, -2.48, californiaBridgeCenterZ],
      group,
    );

    const diagonalPoints: Vector3[] = [];
    for (let index = 0; index < postCountPerSide - 1; index += 1) {
      const segmentLength = californiaBridgeLength / (postCountPerSide - 1);
      const nearZ = CALIFORNIA_BRIDGE.startZ - index * segmentLength;
      const farZ = nearZ - segmentLength;
      diagonalPoints.push(
        new Vector3(x, SCREEN_BOTTOM_Y + 0.08, nearZ),
        new Vector3(x, CALIFORNIA_BRIDGE.screenTopY - 0.08, farZ),
      );
    }
    kit.addLineSegments(diagonalPoints, diagonalMaterial, group);
  });

  group.position.x = CALIFORNIA_BRIDGE.centerX;

  return {
    group,
    resize: (compact: boolean) => {
      group.scale.set(compact ? 0.86 : 1, 1, 1);
      group.position.set(
        compact ? 0 : CALIFORNIA_BRIDGE.centerX,
        compact ? 0.16 : 0,
        0,
      );
    },
    update: () => {},
  };
}

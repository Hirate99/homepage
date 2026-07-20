import {
  BoxGeometry,
  CylinderGeometry,
  Group,
  MathUtils,
  PlaneGeometry,
  Shape,
  ShapeGeometry,
  Vector3,
} from 'three';

import type { SongColors } from '../../../songs/types';
import type { SceneKit } from '../scene-kit';

function createPalm(
  kit: SceneKit,
  parent: Group,
  x: number,
  y: number,
  z: number,
  scale: number,
  phase: number,
) {
  const palm = new Group();
  palm.position.set(x, y, z);
  palm.scale.setScalar(scale);
  parent.add(palm);

  const trunkMaterial = kit.meshMaterial('#172a30', 0.72, true);
  const frondMaterial = kit.lineMaterial('#203b3d', 0.66);
  const trunk = kit.addMesh(
    new CylinderGeometry(0.065, 0.12, 2.8, 8),
    trunkMaterial,
    [0, 1.35, 0],
    palm,
  );
  trunk.rotation.z = -0.055 + phase * 0.012;

  for (let index = 0; index < 8; index += 1) {
    const angle = (index / 8) * Math.PI * 2 + phase;
    const length = 0.72 + (index % 3) * 0.12;
    kit.addLine(
      [
        new Vector3(0, 2.74, 0),
        new Vector3(
          Math.cos(angle) * length * 0.52,
          2.76 + Math.sin(angle * 1.7) * 0.08,
          Math.sin(angle) * length * 0.32,
        ),
        new Vector3(
          Math.cos(angle) * length,
          2.58 - (index % 2) * 0.14,
          Math.sin(angle) * length * 0.54,
        ),
      ],
      frondMaterial,
      palm,
    );
  }

  return palm;
}

export function createCaliforniaHorizon(kit: SceneKit, colors: SongColors) {
  const group = new Group();
  kit.group.add(group);

  const mountainMaterial = kit.meshMaterial('#355b61', 0.62, true);
  const farMountainMaterial = kit.meshMaterial('#78999a', 0.28, true);
  const hazeMaterial = kit.meshMaterial('#f4d4aa', 0.16);
  const cityMaterials = [
    kit.meshMaterial('#21484d', 0.64, true),
    kit.meshMaterial('#315b5d', 0.58, true),
    kit.meshMaterial('#4b6f6e', 0.5, true),
  ];
  const windowMaterial = kit.meshMaterial(colors.signal, 0.23);
  kit.glowMaterials.push(windowMaterial);

  const farShape = new Shape();
  farShape.moveTo(-24, -2.2);
  [
    [-24, -0.4],
    [-18, 0.05],
    [-14, -0.25],
    [-8, 0.62],
    [-3, 0.06],
    [2, 0.82],
    [7, 0.18],
    [12, 0.55],
    [18, -0.08],
    [24, 0.28],
    [24, -2.2],
  ].forEach(([x, y]) => farShape.lineTo(x, y));
  farShape.closePath();
  kit.addMesh(
    new ShapeGeometry(farShape),
    farMountainMaterial,
    [0, -0.55, -31],
    group,
  );

  const nearShape = new Shape();
  nearShape.moveTo(-24, -2.4);
  [
    [-24, -0.9],
    [-19, -0.28],
    [-15, -0.66],
    [-10, 0.08],
    [-6, -0.48],
    [-1, 0.22],
    [4, -0.42],
    [9, 0.16],
    [14, -0.52],
    [19, -0.12],
    [24, -0.74],
    [24, -2.4],
  ].forEach(([x, y]) => nearShape.lineTo(x, y));
  nearShape.closePath();
  kit.addMesh(
    new ShapeGeometry(nearShape),
    mountainMaterial,
    [0, -0.92, -29.5],
    group,
  );

  const haze = kit.addMesh(
    new PlaneGeometry(48, 2.6),
    hazeMaterial,
    [0, -0.38, -28.8],
    group,
  );
  haze.renderOrder = 1;

  const skyline = new Group();
  skyline.position.z = -26.8;
  group.add(skyline);
  const buildings = [
    [-11.5, 1.2, 1.8],
    [-9.7, 0.8, 1.1],
    [-8.35, 1.15, 1.55],
    [-6.65, 0.68, 0.85],
    [6.8, 0.9, 1.2],
    [8.25, 1.45, 2.05],
    [10.15, 0.75, 0.92],
    [11.5, 1.05, 1.38],
  ] as const;
  buildings.forEach(([x, width, height], index) => {
    kit.addMesh(
      new BoxGeometry(width, height, 0.45),
      cityMaterials[index % cityMaterials.length],
      [x, -2.95 + height / 2, 0],
      skyline,
    );
    if (index % 2 === 0) {
      kit.addMesh(
        new PlaneGeometry(width * 0.18, 0.055),
        windowMaterial,
        [x, -2.78 + height * 0.25, 0.231],
        skyline,
      );
    }
  });

  const palms = [
    createPalm(kit, group, -7.8, -3.35, -19.5, 0.88, 0.2),
    createPalm(kit, group, 7.1, -3.4, -22.2, 1.08, 0.8),
  ];

  return {
    group,
    resize: (compact: boolean) => {
      group.scale.set(compact ? 0.94 : 1, compact ? 0.96 : 1, 1);
      group.position.y = compact ? 0.12 : 0;
      skyline.visible = !compact;
    },
    update: (time: number, reducedMotion: boolean) => {
      const drift = reducedMotion ? 0 : Math.sin(time * 0.00034) * 0.012;
      palms.forEach((palm, index) => {
        palm.rotation.z = drift * (index % 2 === 0 ? 1 : -0.7);
      });
      windowMaterial.opacity =
        0.23 * (reducedMotion ? 1 : 0.82 + Math.sin(time * 0.0011) * 0.18);
    },
  };
}

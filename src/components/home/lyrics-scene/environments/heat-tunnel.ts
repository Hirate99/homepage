import {
  BufferGeometry,
  Group,
  Line,
  LineBasicMaterial,
  LineSegments,
  Vector3,
} from 'three';

import type { SceneEnvironment } from './types';

export function createHeatTunnelEnvironment(color: string): SceneEnvironment {
  const group = new Group();
  const tunnelMaterial = new LineBasicMaterial({
    color,
    transparent: true,
    opacity: 0,
  });
  const gridMaterial = new LineBasicMaterial({
    color,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    fog: false,
  });
  const geometries: BufferGeometry[] = [];
  const tunnelLines: Line[] = [];

  const corners = [
    [-5.2, -3.75],
    [5.2, -3.75],
    [5.2, 3.75],
    [-5.2, 3.75],
  ];
  corners.forEach(([x, y]) => {
    const geometry = new BufferGeometry().setFromPoints([
      new Vector3(x, y, 1.8),
      new Vector3(x * 0.42, y * 0.42, -13),
    ]);
    geometries.push(geometry);
    const line = new Line(geometry, tunnelMaterial);
    tunnelLines.push(line);
    group.add(line);
  });

  [-1.4, -4.6, -7.8, -11].forEach((z) => {
    const depthProgress = (1.8 - z) / 14.8;
    const scale = 1 - depthProgress * 0.58;
    const geometry = new BufferGeometry().setFromPoints([
      new Vector3(-5.2 * scale, -3.75 * scale, z),
      new Vector3(5.2 * scale, -3.75 * scale, z),
      new Vector3(5.2 * scale, 3.75 * scale, z),
      new Vector3(-5.2 * scale, 3.75 * scale, z),
      new Vector3(-5.2 * scale, -3.75 * scale, z),
    ]);
    geometries.push(geometry);
    const line = new Line(geometry, tunnelMaterial);
    tunnelLines.push(line);
    group.add(line);
  });

  const gridPoints: Vector3[] = [];
  for (let x = -5; x <= 5; x += 0.9) {
    gridPoints.push(new Vector3(x, -9, -3.4), new Vector3(x, 9, -3.4));
  }
  for (let y = -9; y <= 9; y += 0.9) {
    gridPoints.push(new Vector3(-5, y, -3.4), new Vector3(5, y, -3.4));
  }
  const gridGeometry = new BufferGeometry().setFromPoints(gridPoints);
  geometries.push(gridGeometry);
  const grid = new LineSegments(gridGeometry, gridMaterial);
  grid.rotation.z = -0.035;
  group.add(grid);

  return {
    group,
    resize: (isCompact) => {
      tunnelLines.forEach((line) => {
        line.visible = !isCompact;
      });
      grid.visible = isCompact;
    },
    update: ({ entrance }) => {
      tunnelMaterial.opacity = entrance * 0.14;
      gridMaterial.opacity = entrance * 0.075;
    },
    dispose: () => {
      geometries.forEach((geometry) => geometry.dispose());
      tunnelMaterial.dispose();
      gridMaterial.dispose();
    },
  };
}

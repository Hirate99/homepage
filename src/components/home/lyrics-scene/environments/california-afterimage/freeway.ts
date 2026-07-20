import { BoxGeometry, Group, Matrix4, MathUtils, PlaneGeometry } from 'three';

import type { SongColors } from '../../../songs/types';
import type { SceneKit } from '../scene-kit';
import { CALIFORNIA_BRIDGE } from './geometry';

interface VehicleLight {
  direction: -1 | 1;
  laneZ: number;
  length: number;
  lightSide: -1 | 1;
  offset: number;
  speed: number;
}

const ROAD_WIDTH = 44;
const ROAD_DEPTH = 6.4;
const ROAD_CENTER_Z = -9.2;
const ROAD_SURFACE_Y = -5.06;
const ROAD_START_X = -ROAD_WIDTH / 2 - 2;
const ROAD_END_X = ROAD_WIDTH / 2 + 2;

function createVehicleLights(
  count: number,
  lanes: readonly number[],
  direction: -1 | 1,
  lightSide: -1 | 1,
  seed: number,
): VehicleLight[] {
  return Array.from({ length: count }, (_, index) => ({
    direction,
    laneZ: ROAD_CENTER_Z + lanes[(index * 3 + seed) % lanes.length],
    length: 0.54 + ((index * 7 + seed) % 5) * 0.1,
    lightSide,
    offset: ((index * 11 + seed * 7) % 43) / 43,
    speed: 0.000024 + ((index + seed) % 5) * 0.000004,
  }));
}

export function createCaliforniaFreeway(kit: SceneKit, colors: SongColors) {
  const group = new Group();
  kit.group.add(group);

  const surfaceMaterial = kit.meshMaterial('#29484d', 0.76, true);
  const undersideMaterial = kit.meshMaterial('#20373b', 0.42, true);
  const shoulderMaterial = kit.meshMaterial('#718080', 0.28, true);
  const barrierMaterial = kit.meshMaterial('#8f877c', 0.42, true);
  const sunEdgeMaterial = kit.meshMaterial('#efc48a', 0.28);
  const markingMaterial = kit.meshMaterial('#e8d8bc', 0.22);
  const reflectorMaterial = kit.meshMaterial('#f0b366', 0.42);
  const medianMaterial = kit.meshMaterial('#b9a889', 0.28, true);
  const jointMaterial = kit.meshMaterial('#183438', 0.2);
  const patchMaterial = kit.meshMaterial('#6c8080', 0.075);
  const bridgeShadowMaterial = kit.meshMaterial('#183136', 0.22);

  kit.addMesh(
    new BoxGeometry(ROAD_WIDTH, 0.24, ROAD_DEPTH + 0.32),
    undersideMaterial,
    [0, ROAD_SURFACE_Y - 0.18, ROAD_CENTER_Z],
    group,
  );
  const surface = kit.addMesh(
    new PlaneGeometry(ROAD_WIDTH, ROAD_DEPTH),
    surfaceMaterial,
    [0, ROAD_SURFACE_Y, ROAD_CENTER_Z],
    group,
  );
  surface.rotation.x = -Math.PI / 2;

  const farEdgeZ = ROAD_CENTER_Z - ROAD_DEPTH / 2 + 0.05;
  const nearEdgeZ = ROAD_CENTER_Z + ROAD_DEPTH / 2 - 0.05;
  kit.addMesh(
    new BoxGeometry(ROAD_WIDTH, 0.24, 0.16),
    barrierMaterial,
    [0, ROAD_SURFACE_Y + 0.12, farEdgeZ],
    group,
  );
  kit.addMesh(
    new BoxGeometry(ROAD_WIDTH, 0.032, 0.22),
    sunEdgeMaterial,
    [0, ROAD_SURFACE_Y + 0.255, farEdgeZ],
    group,
  );
  [farEdgeZ + 0.32, nearEdgeZ - 0.18].forEach((z, index) => {
    kit.addMesh(
      new BoxGeometry(ROAD_WIDTH, index === 0 ? 0.04 : 0.065, 0.11),
      shoulderMaterial,
      [0, ROAD_SURFACE_Y + 0.025, z],
      group,
    );
  });
  kit.addMesh(
    new BoxGeometry(ROAD_WIDTH, 0.055, 0.2),
    medianMaterial,
    [0, ROAD_SURFACE_Y + 0.035, ROAD_CENTER_Z],
    group,
  );
  kit.addMesh(
    new BoxGeometry(ROAD_WIDTH, 0.015, 0.045),
    reflectorMaterial,
    [0, ROAD_SURFACE_Y + 0.069, ROAD_CENTER_Z],
    group,
  );

  const laneOffsets = [-2.12, -1.04, 1.04, 2.12] as const;
  const dashCount = 14;
  const laneDashes = kit.addInstancedMesh(
    new BoxGeometry(1.08, 0.018, 0.045),
    markingMaterial,
    laneOffsets.length * dashCount,
    group,
  );
  const matrix = new Matrix4();
  laneOffsets.forEach((zOffset, laneIndex) => {
    for (let index = 0; index < dashCount; index += 1) {
      matrix.makeTranslation(
        -20.4 + index * 3.08 + (laneIndex % 2) * 1.42,
        ROAD_SURFACE_Y + 0.016,
        ROAD_CENTER_Z + zOffset,
      );
      laneDashes.setMatrixAt(laneIndex * dashCount + index, matrix);
    }
  });
  laneDashes.instanceMatrix.needsUpdate = true;

  [-13.4, -4.55, 4.4, 13.35].forEach((x) => {
    kit.addMesh(
      new BoxGeometry(0.035, 0.016, ROAD_DEPTH - 0.42),
      jointMaterial,
      [x, ROAD_SURFACE_Y + 0.012, ROAD_CENTER_Z],
      group,
    );
  });
  [
    [-12.6, -9.9, 4.2, 0.4],
    [7.3, -8.15, 5.1, 0.36],
  ].forEach(([x, z, width, depth]) => {
    const patch = kit.addMesh(
      new PlaneGeometry(width, depth),
      patchMaterial,
      [x, ROAD_SURFACE_Y + 0.011, z],
      group,
    );
    patch.rotation.x = -Math.PI / 2;
  });

  const bridgeShadow = kit.addMesh(
    new PlaneGeometry(CALIFORNIA_BRIDGE.width + 0.9, ROAD_DEPTH - 0.22),
    bridgeShadowMaterial,
    [CALIFORNIA_BRIDGE.centerX + 0.36, ROAD_SURFACE_Y + 0.02, ROAD_CENTER_Z],
    group,
  );
  bridgeShadow.rotation.set(-Math.PI / 2, 0, -0.06);

  const trafficLayers = [
    {
      vehicles: createVehicleLights(9, [-2.42, -1.35], 1, 1, 2),
      body: '#c7bda8',
      light: colors.signal,
      trail: '#efbd76',
      bodyOpacity: 0.22,
      lightOpacity: 0.68,
      trailOpacity: 0.18,
    },
    {
      vehicles: createVehicleLights(8, [1.34, 2.42], -1, -1, 7),
      body: '#87605b',
      light: '#de6c53',
      trail: '#cb5b49',
      bodyOpacity: 0.22,
      lightOpacity: 0.64,
      trailOpacity: 0.16,
    },
    {
      vehicles: createVehicleLights(4, [-2.42, -1.35], 1, 1, 11),
      body: '#789193',
      light: '#bde6e2',
      trail: '#91c9c6',
      bodyOpacity: 0.16,
      lightOpacity: 0.54,
      trailOpacity: 0.12,
    },
    {
      vehicles: createVehicleLights(3, [1.34, 2.42], -1, -1, 17),
      body: '#75666a',
      light: '#d76553',
      trail: '#b9574b',
      bodyOpacity: 0.14,
      lightOpacity: 0.48,
      trailOpacity: 0.1,
    },
  ].map(
    ({
      vehicles,
      body,
      light,
      trail,
      bodyOpacity,
      lightOpacity,
      trailOpacity,
    }) => {
      const bodyMaterial = kit.meshMaterial(body, bodyOpacity, true);
      const lightMaterial = kit.meshMaterial(light, lightOpacity);
      const trailMaterial = kit.meshMaterial(trail, trailOpacity);
      kit.glowMaterials.push(lightMaterial, trailMaterial);

      return {
        vehicles,
        bodyMaterial,
        lightMaterial,
        trailMaterial,
        bodyOpacity,
        lightOpacity,
        trailOpacity,
        bodies: kit.addInstancedMesh(
          new BoxGeometry(1, 0.055, 0.16),
          bodyMaterial,
          vehicles.length,
          group,
        ),
        lights: kit.addInstancedMesh(
          new BoxGeometry(0.13, 0.042, 0.11),
          lightMaterial,
          vehicles.length,
          group,
        ),
        trails: kit.addInstancedMesh(
          new BoxGeometry(1, 0.018, 0.05),
          trailMaterial,
          vehicles.length,
          group,
        ),
      };
    },
  );

  const setInstance = (
    mesh: (typeof trafficLayers)[number]['bodies'],
    index: number,
    x: number,
    y: number,
    z: number,
    scaleX: number,
  ) => {
    matrix.makeScale(scaleX, 1, 1);
    matrix.setPosition(x, y, z);
    mesh.setMatrixAt(index, matrix);
  };

  return {
    group,
    resize: (compact: boolean) => {
      group.scale.set(compact ? 0.9 : 1, 1, compact ? 0.95 : 1);
      group.position.y = compact ? 0.16 : 0;
    },
    update: (time: number, reducedMotion: boolean) => {
      trafficLayers.forEach((layer, layerIndex) => {
        layer.vehicles.forEach((vehicle, index) => {
          const travel = reducedMotion
            ? vehicle.offset
            : (vehicle.offset + time * vehicle.speed) % 1;
          const directedTravel = vehicle.direction === 1 ? travel : 1 - travel;
          const x = MathUtils.lerp(ROAD_START_X, ROAD_END_X, directedTravel);
          const y = ROAD_SURFACE_Y + 0.055 + (index % 3) * 0.002;
          const trailLength = vehicle.length * (0.82 + layerIndex * 0.16);
          const trailX =
            x - vehicle.direction * (vehicle.length + trailLength) * 0.42;

          setInstance(layer.bodies, index, x, y, vehicle.laneZ, vehicle.length);
          setInstance(
            layer.lights,
            index,
            x + vehicle.direction * vehicle.lightSide * vehicle.length * 0.5,
            y + 0.008,
            vehicle.laneZ,
            1,
          );
          setInstance(
            layer.trails,
            index,
            trailX,
            ROAD_SURFACE_Y + 0.03,
            vehicle.laneZ,
            trailLength,
          );
        });
        layer.bodies.instanceMatrix.needsUpdate = true;
        layer.lights.instanceMatrix.needsUpdate = true;
        layer.trails.instanceMatrix.needsUpdate = true;

        const shimmer = reducedMotion
          ? 0.9
          : 0.86 + Math.sin(time * 0.001 + layerIndex * 1.6) * 0.07;
        layer.lightMaterial.opacity = layer.lightOpacity * shimmer;
        layer.trailMaterial.opacity = layer.trailOpacity * shimmer;
        layer.bodyMaterial.opacity = layer.bodyOpacity;
      });
    },
  };
}

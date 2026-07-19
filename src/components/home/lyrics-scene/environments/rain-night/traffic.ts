import { BoxGeometry, Group, MathUtils } from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

import type { SongColors } from '../../../songs/types';

import type { RainSceneKit } from './scene-kit';

interface TrafficRoute {
  from: [number, number];
  to: [number, number];
}

export function createRainTraffic(kit: RainSceneKit, colors: SongColors) {
  const group = new Group();
  kit.group.add(group);

  const bodyMaterials = [
    kit.meshMaterial('#61757a', 0.72, true),
    kit.meshMaterial('#785d69', 0.68, true),
    kit.meshMaterial('#737b70', 0.66, true),
  ];
  const cabinMaterial = kit.meshMaterial('#14242b', 0.82, true);
  const headlightMaterial = kit.meshMaterial(colors.signal, 0.62);
  const tailLightMaterial = kit.meshMaterial('#b86b79', 0.58);
  kit.glowMaterials.push(headlightMaterial, tailLightMaterial);

  const routes: TrafficRoute[] = [
    { from: [-12.5, -21.5], to: [2.4, -3.8] },
    { from: [8.5, -22.5], to: [-11.5, -7.5] },
    { from: [13.5, -8.3], to: [-10.5, -18.5] },
    { from: [-13.5, -6.8], to: [13.2, -12.3] },
  ];

  const vehicles = routes.map((route, index) => {
    const vehicle = new Group();
    const yaw = Math.atan2(
      route.to[0] - route.from[0],
      route.to[1] - route.from[1],
    );
    vehicle.rotation.y = yaw;
    group.add(vehicle);

    kit.addMesh(
      new RoundedBoxGeometry(0.42, 0.18, 0.78, 2, 0.055),
      bodyMaterials[index % bodyMaterials.length],
      [0, 0, 0],
      vehicle,
    );
    kit.addMesh(
      new BoxGeometry(0.3, 0.1, 0.34),
      cabinMaterial,
      [0, 0.13, -0.02],
      vehicle,
    );
    [-0.13, 0.13].forEach((x) => {
      kit.addMesh(
        new BoxGeometry(0.055, 0.035, 0.045),
        headlightMaterial,
        [x, 0.02, 0.405],
        vehicle,
      );
      kit.addMesh(
        new BoxGeometry(0.055, 0.035, 0.045),
        tailLightMaterial,
        [x, 0.02, -0.405],
        vehicle,
      );
    });

    return {
      vehicle,
      route,
      stopProgress: 0.3 + (index % 3) * 0.025,
      approachEnd: 0.15 + (index % 2) * 0.018,
      departureStart: 0.7 + (index % 3) * 0.012,
    };
  });
  const signalCycleDuration = 9_800;
  let signalPhase = 0.08;
  let motionTime = 0;
  let lastTime: number | null = null;

  return {
    group,
    resize: (compact: boolean) => {
      group.scale.setScalar(compact ? 0.95 : 1);
    },
    update: (time: number, reducedMotion: boolean) => {
      const frameDelta =
        lastTime === null ? 0 : Math.min(Math.max(time - lastTime, 0), 48);
      lastTime = time;

      if (!reducedMotion) {
        signalPhase = (signalPhase + frameDelta / signalCycleDuration) % 1;
        motionTime += frameDelta;
      }

      vehicles.forEach((vehicle, index) => {
        let progress = vehicle.stopProgress;
        let velocity = 0;

        if (reducedMotion) {
          progress = vehicle.stopProgress;
        } else if (signalPhase < vehicle.approachEnd) {
          const approachProgress = signalPhase / vehicle.approachEnd;
          progress = MathUtils.lerp(
            0,
            vehicle.stopProgress,
            1 - Math.pow(1 - approachProgress, 2),
          );
          velocity = 1 - approachProgress;
        } else if (signalPhase >= vehicle.departureStart) {
          const departureProgress =
            (signalPhase - vehicle.departureStart) /
            (1 - vehicle.departureStart);
          progress = MathUtils.lerp(
            vehicle.stopProgress,
            1,
            departureProgress * departureProgress,
          );
          velocity = departureProgress;
        }

        vehicle.vehicle.position.set(
          MathUtils.lerp(vehicle.route.from[0], vehicle.route.to[0], progress),
          -3.62 +
            (reducedMotion
              ? 0
              : Math.sin(motionTime * 0.009 + index) * 0.006 * velocity),
          MathUtils.lerp(vehicle.route.from[1], vehicle.route.to[1], progress),
        );
      });
    },
  };
}

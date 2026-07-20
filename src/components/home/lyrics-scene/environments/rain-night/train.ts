import { BoxGeometry, Group, MathUtils, PlaneGeometry } from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

import type { SongColors } from '../../../songs/types';

import type { SceneKit } from '../scene-kit';

function hermite(
  progress: number,
  from: number,
  to: number,
  fromTangent: number,
  toTangent: number,
) {
  const progress2 = progress * progress;
  const progress3 = progress2 * progress;
  return (
    (2 * progress3 - 3 * progress2 + 1) * from +
    (progress3 - 2 * progress2 + progress) * fromTangent +
    (-2 * progress3 + 3 * progress2) * to +
    (progress3 - progress2) * toTangent
  );
}

function getTrainProgress(progress: number) {
  if (progress < 0.08) {
    return 0;
  }
  if (progress < 0.34) {
    const local = (progress - 0.08) / 0.26;
    return hermite(local, 0, 0.44, 0.72, 0.13);
  }
  if (progress < 0.44) {
    const local = (progress - 0.34) / 0.1;
    return hermite(local, 0.44, 0.5, 0.05, 0);
  }
  if (progress < 0.58) {
    return 0.5;
  }
  if (progress < 0.72) {
    const local = (progress - 0.58) / 0.14;
    return hermite(local, 0.5, 0.58, 0, 0.16);
  }
  if (progress < 0.94) {
    const local = (progress - 0.72) / 0.22;
    return hermite(local, 0.58, 1, 0.25, 0.62);
  }
  return 1;
}

function getTrainVelocity(progress: number) {
  if (progress >= 0.08 && progress < 0.34) {
    const local = (progress - 0.08) / 0.26;
    return 1 - local * 0.62;
  }
  if (progress < 0.44) {
    return Math.max(0, 0.38 * (1 - (progress - 0.34) / 0.1));
  }
  if (progress >= 0.58 && progress < 0.72) {
    return ((progress - 0.58) / 0.14) * 0.45;
  }
  if (progress >= 0.72 && progress < 0.94) {
    return 0.45 + ((progress - 0.72) / 0.22) * 0.55;
  }
  return 0;
}

export function createRainTrain(kit: SceneKit, colors: SongColors) {
  const group = new Group();
  const train = new Group();
  const cycleDuration = 13_600;
  let trainPhase = 0.48;
  let motionTime = 0;
  let lastTime: number | null = null;
  group.add(train);
  kit.group.add(group);

  const railMaterial = kit.meshMaterial('#172831', 0.96, true);
  const sleeperMaterial = kit.meshMaterial('#31434a', 0.24, true);
  [-1.58, -2.26].forEach((z) => {
    kit.addMesh(
      new BoxGeometry(32, 0.12, 0.13),
      railMaterial,
      [0, -3.84, z],
      group,
    );
  });
  for (let index = 0; index < 13; index += 1) {
    kit.addMesh(
      new BoxGeometry(0.07, 0.045, 0.76),
      sleeperMaterial,
      [-15.6 + index * 2.6, -3.9, -1.92],
      group,
    );
  }

  const yamanoteGreen = '#8ec63f';
  const bodyMaterial = kit.meshMaterial('#64777a', 0.56, true);
  const roofMaterial = kit.meshMaterial('#334950', 0.6, true);
  const roofDetailMaterial = kit.meshMaterial('#65777b', 0.42, true);
  const greenMaterial = kit.meshMaterial(yamanoteGreen, 0.38);
  const windowBandMaterial = kit.meshMaterial('#101a1f', 0.78, true);
  const windowGlowMaterial = kit.meshMaterial('#9fb8af', 0.27);
  const destinationMaterial = kit.meshMaterial(colors.signal, 0.5);
  const undercarriageMaterial = kit.meshMaterial('#142229', 0.74, true);
  const motionTrailMaterial = kit.meshMaterial(yamanoteGreen, 0.045);
  kit.glowMaterials.push(windowGlowMaterial, destinationMaterial);

  kit.addMesh(
    new PlaneGeometry(5.4, 0.045),
    motionTrailMaterial,
    [-10.8, -2.72, -1.522],
    train,
  );

  [-6.05, -2.02, 2.02, 6.05].forEach((carX, carIndex) => {
    kit.addMesh(
      new RoundedBoxGeometry(3.86, 1.38, 0.76, 3, 0.08),
      bodyMaterial,
      [carX, -3.02, -1.93],
      train,
    );
    kit.addMesh(
      new RoundedBoxGeometry(3.76, 0.13, 0.7, 2, 0.04),
      roofMaterial,
      [carX, -2.28, -1.93],
      train,
    );
    [-0.62, 0.62].forEach((offset) => {
      kit.addMesh(
        new BoxGeometry(0.42, 0.08, 0.28),
        roofDetailMaterial,
        [carX + offset, -2.17, -1.93],
        train,
      );
    });
    const roofStripe = kit.addMesh(
      new PlaneGeometry(3.42, 0.065),
      greenMaterial,
      [carX, -2.212, -1.93],
      train,
    );
    roofStripe.rotation.x = -Math.PI / 2;
    kit.addMesh(
      new PlaneGeometry(3.72, 0.7),
      windowBandMaterial,
      [carX, -2.63, -1.538],
      train,
    );

    [-0.92, 0.92].forEach((offset) => {
      kit.addMesh(
        new PlaneGeometry(0.12, 1.12),
        greenMaterial,
        [carX + offset, -2.98, -1.536],
        train,
      );
    });

    [-0.61, 0.61].forEach((offset) => {
      kit.addMesh(
        new PlaneGeometry(0.5, 0.4),
        windowGlowMaterial,
        [carX + offset, -2.62, -1.532],
        train,
      );
    });

    kit.addMesh(
      new PlaneGeometry(3.58, 0.22),
      undercarriageMaterial,
      [carX, -3.63, -1.534],
      train,
    );

    if (carIndex === 0 || carIndex === 3) {
      kit.addMesh(
        new PlaneGeometry(0.42, 0.13),
        destinationMaterial,
        [carX + (carIndex === 0 ? -1.35 : 1.35), -2.26, -1.537],
        train,
      );
    }
  });

  kit.addMesh(
    new PlaneGeometry(0.42, 1.24),
    windowBandMaterial,
    [7.72, -2.87, -1.526],
    train,
  );
  kit.addMesh(
    new PlaneGeometry(0.1, 1.04),
    greenMaterial,
    [7.72, -2.91, -1.52],
    train,
  );

  return {
    group,
    resize: (compact: boolean) => {
      group.position.x = 0;
      group.position.y = compact ? 2.45 : 8.05;
      group.rotation.y = compact ? -0.018 : -0.035;
      train.scale.set(compact ? 0.6 : 0.65, compact ? 0.66 : 0.68, 0.74);
    },
    update: (time: number, reducedMotion: boolean) => {
      const frameDelta =
        lastTime === null ? 0 : Math.min(Math.max(time - lastTime, 0), 48);
      lastTime = time;
      if (!reducedMotion) {
        trainPhase = (trainPhase + frameDelta / cycleDuration) % 1;
        motionTime += frameDelta;
      }
      const speedCurve = getTrainProgress(trainPhase);
      const velocity = getTrainVelocity(trainPhase);
      train.visible =
        reducedMotion || (trainPhase >= 0.06 && trainPhase <= 0.96);
      train.position.x = reducedMotion
        ? 0
        : MathUtils.lerp(-21, 21, speedCurve);
      train.position.y = reducedMotion
        ? 0
        : Math.sin(motionTime * 0.012) * 0.014 * velocity;
      motionTrailMaterial.opacity *= reducedMotion ? 0 : velocity;
    },
  };
}

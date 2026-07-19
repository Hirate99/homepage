import { Group, MathUtils } from 'three';

import type { SongColors } from '../../songs/types';

import { createRainCity } from './rain-night/city';
import { createRainIntersection } from './rain-night/intersection';
import { createRainSceneKit } from './rain-night/scene-kit';
import { createRainTraffic } from './rain-night/traffic';
import { createRainTrain } from './rain-night/train';
import { createWindowRain } from './rain-night/weather';
import type { SceneEnvironment } from './types';

export function createRainNightEnvironment(
  colors: SongColors,
): SceneEnvironment {
  const kit = createRainSceneKit();
  const city = createRainCity(kit, colors);
  const intersection = createRainIntersection(kit, colors);
  const traffic = createRainTraffic(kit, colors);
  const train = createRainTrain(kit, colors);
  const weather = createWindowRain(kit, colors);
  const worldPivot = new Group();
  const worldContent = new Group();
  const lyricSurface = new Group();
  worldPivot.add(worldContent);
  worldContent.add(
    city.group,
    intersection.group,
    traffic.group,
    train.group,
    lyricSurface,
  );
  kit.group.add(worldPivot);
  let isCompact = false;

  return {
    group: kit.group,
    lyricSurface,
    resize: (compact) => {
      isCompact = compact;
      kit.group.scale.setScalar(compact ? 0.93 : 1);
      kit.group.position.y = compact ? 0.62 : 0;
      city.resize(compact);
      intersection.resize(compact);
      traffic.resize(compact);
      train.resize(compact);
      weather.resize(compact);

      const pivotY = compact ? -2.7 : -2.85;
      const pivotZ = compact ? -10.4 : -10.8;
      worldPivot.position.set(0, pivotY, pivotZ);
      worldContent.position.set(0, -pivotY, -pivotZ);
      worldPivot.rotation.x = compact ? 0.62 : 0.78;
      worldPivot.rotation.z = compact ? -0.015 : -0.035;
    },
    update: ({ time, entrance, reducedMotion, pointer }) => {
      kit.applyEntrance(entrance);
      city.update(time, reducedMotion);
      train.update(time, reducedMotion);
      intersection.update(time, reducedMotion);
      traffic.update(time, reducedMotion);
      weather.update(time, entrance, reducedMotion);

      const shimmer = reducedMotion ? 1 : 0.9 + Math.sin(time * 0.0021) * 0.1;
      kit.glowMaterials.forEach((material) => {
        material.opacity *= shimmer;
      });
      kit.reflectionMaterials.forEach((material, index) => {
        material.opacity *= reducedMotion
          ? 1
          : 0.84 + Math.sin(time * 0.0012 + index) * 0.16;
      });

      kit.group.position.x = MathUtils.lerp(
        kit.group.position.x,
        reducedMotion || isCompact ? 0 : pointer.x * 0.06,
        0.05,
      );
      city.group.position.x = MathUtils.lerp(
        city.group.position.x,
        isCompact ? 0 : pointer.x * -0.12,
        0.04,
      );
      city.group.rotation.y = MathUtils.lerp(
        city.group.rotation.y,
        reducedMotion || isCompact ? 0 : pointer.x * -0.012,
        0.05,
      );
      worldPivot.rotation.x = MathUtils.lerp(
        worldPivot.rotation.x,
        (isCompact ? 0.62 : 0.78) +
          (reducedMotion || isCompact ? 0 : pointer.y * -0.018),
        0.04,
      );
      worldPivot.rotation.y = MathUtils.lerp(
        worldPivot.rotation.y,
        reducedMotion || isCompact ? 0 : pointer.x * 0.012,
        0.04,
      );
    },
    dispose: kit.dispose,
  };
}

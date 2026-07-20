import type { SongColors } from '../../songs/types';

import { createCaliforniaFreeway } from './california-afterimage/freeway';
import { createCaliforniaGhost } from './california-afterimage/ghost';
import { createCaliforniaHorizon } from './california-afterimage/horizon';
import { createCaliforniaOverpass } from './california-afterimage/overpass';
import { createSceneKit } from './scene-kit';
import type { SceneEnvironment } from './types';

export function createCaliforniaAfterimageEnvironment(
  colors: SongColors,
): SceneEnvironment {
  const kit = createSceneKit();
  const horizon = createCaliforniaHorizon(kit, colors);
  const freeway = createCaliforniaFreeway(kit, colors);
  const overpass = createCaliforniaOverpass(kit, colors);
  const ghost = createCaliforniaGhost(kit);

  return {
    group: kit.group,
    interactions: ghost.interaction ? [ghost.interaction] : undefined,
    resize: (compact) => {
      kit.group.scale.setScalar(compact ? 0.92 : 1);
      kit.group.position.set(0, compact ? 0.38 : 0, 0);
      kit.group.rotation.set(0, 0, 0);
      horizon.resize(compact);
      freeway.resize(compact);
      overpass.resize(compact);
      ghost.resize(compact);
    },
    update: ({ time, entrance, reducedMotion }) => {
      kit.applyEntrance(entrance);
      horizon.update(time, reducedMotion);
      freeway.update(time, reducedMotion);
      overpass.update();
      ghost.update(time, reducedMotion);
    },
    dispose: kit.dispose,
  };
}

import type { SongThemeId } from '../songs';

export type StoryBridgeMotif = 'freeway' | 'rainfall';

export interface HomeSceneStoryProfile {
  bridge: StoryBridgeMotif;
  camera: {
    fov: number;
    y: number;
    z: number;
  };
  fog: {
    far: number;
    near: number;
  };
  lyrics: {
    opacity: number;
    rotateX: number;
    y: number;
    z: number;
  };
  world: {
    rotateX: number;
    rotateY: number;
    scale: number;
    y: number;
    z: number;
  };
}

const HOME_SCENE_STORY_PROFILES: Record<SongThemeId, HomeSceneStoryProfile> = {
  'rain-night': {
    bridge: 'rainfall',
    camera: {
      fov: 5.5,
      y: 0.48,
      z: 1.35,
    },
    fog: {
      near: -2.5,
      far: -8,
    },
    lyrics: {
      opacity: 0.12,
      rotateX: -0.08,
      y: 0.28,
      z: -1.3,
    },
    world: {
      rotateX: 0.11,
      rotateY: -0.018,
      scale: 0.91,
      y: -0.5,
      z: -2.7,
    },
  },
  'california-afterimage': {
    bridge: 'freeway',
    camera: {
      fov: 4.5,
      y: 0.38,
      z: 1.15,
    },
    fog: {
      near: -2,
      far: -7,
    },
    lyrics: {
      opacity: 0.1,
      rotateX: -0.045,
      y: 0.18,
      z: -1.5,
    },
    world: {
      rotateX: 0.075,
      rotateY: 0.015,
      scale: 0.9,
      y: -0.42,
      z: -2.9,
    },
  },
};

export function getHomeSceneStoryProfile(theme: SongThemeId) {
  return HOME_SCENE_STORY_PROFILES[theme];
}

import type { SongThemeId } from '../../songs/types';

import { CaliforniaAfterimageTheme } from './california-afterimage';
import { RainNightTheme } from './rain-night';
import type { SongSceneTheme } from './types';

const SongSceneThemes: Record<SongThemeId, SongSceneTheme> = {
  'california-afterimage': CaliforniaAfterimageTheme,
  'rain-night': RainNightTheme,
};

export function getSongSceneTheme(themeId: SongThemeId) {
  return SongSceneThemes[themeId];
}

export type { SongSceneTheme } from './types';

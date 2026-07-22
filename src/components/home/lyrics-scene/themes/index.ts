import type { SongThemeId } from '../../songs/types';

import type { SongSceneTheme } from './types';

export async function loadSongSceneTheme(
  themeId: SongThemeId,
): Promise<SongSceneTheme> {
  switch (themeId) {
    case 'california-afterimage':
      return (await import('./california-afterimage'))
        .CaliforniaAfterimageTheme;
    case 'rain-night':
      return (await import('./rain-night')).RainNightTheme;
  }
}

export type { SongSceneTheme } from './types';

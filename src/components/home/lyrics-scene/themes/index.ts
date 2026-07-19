import type { SongThemeId } from '../../songs/types';

import { HeatTunnelTheme } from './heat-tunnel';
import { RainNightTheme } from './rain-night';
import type { SongSceneTheme } from './types';

const SongSceneThemes: Record<SongThemeId, SongSceneTheme> = {
  'heat-tunnel': HeatTunnelTheme,
  'rain-night': RainNightTheme,
};

export function getSongSceneTheme(themeId: SongThemeId) {
  return SongSceneThemes[themeId];
}

export type { SongSceneTheme } from './types';

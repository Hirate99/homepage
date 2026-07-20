import { OrangeDaySong } from './orange-day';
import { RainSong } from './rain';
import type { SongDefinition } from './types';

export type {
  SongDefinition,
  SongLyricCue,
  SongLyricRole,
  SongThemeId,
} from './types';

function assertValidSong(song: SongDefinition) {
  const cueIds = new Set<string>();
  song.lyricCues.forEach((cue) => {
    if (!cue.id || !cue.text) {
      throw new Error(`Song ${song.id} contains an empty lyric cue.`);
    }
    if (cueIds.has(cue.id)) {
      throw new Error(`Song ${song.id} repeats lyric cue id ${cue.id}.`);
    }
    cueIds.add(cue.id);
  });

  song.mobileLyrics.forEach(({ cueId }) => {
    if (!cueIds.has(cueId)) {
      throw new Error(
        `Song ${song.id} mobile layout references unknown cue ${cueId}.`,
      );
    }
  });
}

export const Songs = [OrangeDaySong, RainSong] satisfies SongDefinition[];
Songs.forEach(assertValidSong);

export function findSong(songId: string | null) {
  return Songs.find((song) => song.id === songId);
}

export function getRandomSong() {
  const random = new Uint32Array(1);
  globalThis.crypto.getRandomValues(random);
  return Songs[random[0] % Songs.length];
}

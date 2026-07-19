import { OrangeDaySong } from './orange-day';
import { RainSong } from './rain';

export type { SongDefinition, SongThemeId } from './types';

export const Songs = [OrangeDaySong, RainSong];

export function findSong(songId: string | null) {
  return Songs.find((song) => song.id === songId);
}

export function getRandomSong() {
  const random = new Uint32Array(1);
  globalThis.crypto.getRandomValues(random);
  return Songs[random[0] % Songs.length];
}

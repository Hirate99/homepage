import type { SongDefinition } from '../songs';

export function getLyricFragments(song: SongDefinition) {
  return Array.from(new Set(song.lyrics.split(/\n+/).filter(Boolean)));
}

export function createMobileLayout(song: SongDefinition, fragments: string[]) {
  const positions: Record<
    number,
    { x: number; y: number; z: number; rotation: number }
  > = {};
  const order: number[] = [];

  song.mobileLyrics.forEach((item) => {
    const index = fragments.indexOf(item.text);
    if (index >= 0) {
      positions[index] = item;
      order.push(index);
    }
  });

  return { positions, order };
}

import type { SongDefinition, SongLyricCue } from '../songs';

export function getLyricCues(song: SongDefinition) {
  return song.lyricCues;
}

export function createMobileLayout(song: SongDefinition, cues: SongLyricCue[]) {
  const positions: Record<
    number,
    { x: number; y: number; z: number; rotation: number }
  > = {};
  const order: number[] = [];

  song.mobileLyrics.forEach((item) => {
    const index = cues.findIndex((cue) => cue.id === item.cueId);
    if (index >= 0) {
      positions[index] = item;
      order.push(index);
    }
  });

  return { positions, order };
}

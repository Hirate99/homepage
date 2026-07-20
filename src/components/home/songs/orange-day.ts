import { Lyrics } from '../lyrics.data';

import type { SongDefinition, SongLyricCue } from './types';

const OrangeLyricIds = [
  'waiting',
  'chasing',
  'receding-days',
  'voice-origin',
  'voice-fades',
  'yearning',
  'embrace',
  'broken',
  'love-and-sorrow',
  'burned-by-longing',
  'far-away',
  'question-that-day',
  'continues-forever',
  'still-waiting',
  'walking-alone',
  'rusted-walkway',
  'blue-deep-orange-day',
  'beside-you',
  'without-color',
] as const;

const OrangeLyricTexts = Array.from(
  new Set(Lyrics.split(/\n+/).filter(Boolean)),
);

const OrangeLyricCues: SongLyricCue[] = OrangeLyricTexts.map((text, index) => ({
  id: OrangeLyricIds[index] ?? `orange-day-${index}`,
  text,
  section:
    index < 3
      ? 'distance'
      : index < 5
        ? 'signal'
        : index < 10
          ? 'fracture'
          : index < 14
            ? 'waiting'
            : 'afterimage',
  role:
    index === 16
      ? 'title'
      : index >= 14
        ? 'horizon'
        : index < 5
          ? 'anchor'
          : 'ground',
}));

export const OrangeDaySong: SongDefinition = {
  id: 'orange-day',
  title: '青い、濃い、橙色の日',
  artist: 'MASS OF THE FERMENTING DREGS',
  lyrics: Lyrics,
  lyricCues: OrangeLyricCues,
  theme: 'california-afterimage',
  colors: {
    background: '#f3dfb9',
    ink: '#173d3d',
    accent: '#df6438',
    signal: '#efb765',
    rule: 'rgba(23, 61, 61, 0.26)',
    lyrics: ['#d95731', '#e87549', '#244f50', '#5e9096', '#a9674e'],
    echoes: ['#e46238', '#72a8ad'],
    structure: '#8d6654',
    ripples: ['#ea7448', '#efb765', '#6c9da2', '#c94f31'],
  },
  mobileLyrics: [
    { cueId: 'waiting', x: 1.1, y: 2.55, z: -0.5, rotation: -0.04 },
    { cueId: 'chasing', x: 1.05, y: 1.4, z: -0.2, rotation: 0.045 },
    {
      cueId: 'receding-days',
      x: 0,
      y: 0.1,
      z: -0.5,
      rotation: -0.02,
    },
    { cueId: 'voice-fades', x: -0.7, y: -0.85, z: -0.45, rotation: -0.035 },
    { cueId: 'yearning', x: -1.25, y: -1.7, z: -0.35, rotation: -0.045 },
    {
      cueId: 'blue-deep-orange-day',
      x: 0.55,
      y: -2.6,
      z: -0.4,
      rotation: 0.025,
    },
    { cueId: 'without-color', x: 0, y: -3.3, z: -0.65, rotation: 0 },
  ],
};

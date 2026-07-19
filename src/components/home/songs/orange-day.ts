import { Lyrics } from '../lyrics.data';

import type { SongDefinition } from './types';

export const OrangeDaySong: SongDefinition = {
  id: 'orange-day',
  title: '青い、濃い、橙色の日',
  artist: 'MASS OF THE FERMENTING DREGS',
  lyrics: Lyrics,
  theme: 'heat-tunnel',
  colors: {
    background: '#f4efe3',
    ink: '#173a32',
    accent: '#c94825',
    signal: '#77a89d',
    rule: 'rgba(23, 58, 50, 0.28)',
    lyrics: ['#c94825', '#df6037', '#e98968', '#edaf96'],
    echoes: ['#ec6138', '#77a89d'],
    structure: '#cf5a36',
    ripples: ['#d84d29', '#77a89d', '#173a32', '#ec8967'],
  },
  mobileLyrics: [
    { text: '待ちぼうけさ', x: 1.25, y: 2.9, z: -0.5, rotation: -0.04 },
    { text: '追い掛けても', x: 1.25, y: 1.6, z: -0.2, rotation: 0.045 },
    {
      text: '遠ざかっていく日も見えない',
      x: 0,
      y: -0.4,
      z: -0.5,
      rotation: -0.02,
    },
    { text: '焦がれて', x: -1.5, y: -1.4, z: -0.45, rotation: -0.045 },
    { text: '抱いたら', x: 1.45, y: -2.25, z: -0.2, rotation: 0.065 },
    { text: '壊れてしまったよ', x: 0, y: -3.1, z: -0.65, rotation: 0 },
  ],
};

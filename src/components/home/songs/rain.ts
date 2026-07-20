import type { SongDefinition, SongLyricCue } from './types';

const RainLyricTexts = [
  '君の生活のことをおもう',
  '雨のにおいがする',
  '体温はずっと下がらないまま',
  '部屋にこもってる',
  '窓から見える',
  '光が揺れてる',
  '雨、雨',
  '君がくれたCDを聴く',
  '何度も繰り返す',
  'スピードはずっと変わらない',
  'まだ部屋にこもってる',
  '夜だけ見える',
  '光が揺れてる',
  '雨、雨',
  '雨',
  'できれば',
  'このまま',
  'わたしに',
  'きづかないで',
  'それでは',
  'またどこかで',
  'あいましょう',
  'さようなら',
];

const RainLyricIds = [
  'life',
  'rain-scent',
  'temperature',
  'inside-room',
  'through-window',
  'shifting-light-first',
  'rain-refrain-first',
  'gifted-cd',
  'repeat',
  'constant-speed',
  'still-inside',
  'night-only',
  'shifting-light-second',
  'rain-refrain-second',
  'rain-single',
  'if-possible',
  'as-we-are',
  'from-me',
  'do-not-notice',
  'well-then',
  'somewhere-again',
  'meet-again',
  'goodbye',
] as const;

const RainLyricCues: SongLyricCue[] = RainLyricTexts.map((text, index) => ({
  id: RainLyricIds[index] ?? `rain-${index}`,
  text,
  section:
    index < 7
      ? 'room'
      : index < 13
        ? 'memory'
        : index < 17
          ? 'distance'
          : 'farewell',
  role: index < 3 ? 'anchor' : index === 6 ? 'title' : 'ground',
}));

const RainLyrics = RainLyricTexts.join('\n');

export const RainSong: SongDefinition = {
  id: 'rain',
  title: '雨',
  artist: '羊文学',
  lyrics: RainLyrics,
  lyricCues: RainLyricCues,
  theme: 'rain-night',
  colors: {
    background: '#071927',
    ink: '#d8e7e6',
    accent: '#77b5c0',
    signal: '#e6b865',
    rule: 'rgba(148, 192, 200, 0.34)',
    lyrics: ['#a9d1d4', '#6ea7b3', '#d8e7e6', '#e6b865', '#ad7894'],
    echoes: ['#5ca2b2', '#ad7894'],
    structure: '#426979',
    ripples: ['#a9d1d4', '#5ca2b2', '#e6b865', '#ad7894'],
  },
  mobileLyrics: [
    {
      cueId: 'life',
      x: 0.35,
      y: 2.7,
      z: -0.75,
      rotation: -0.02,
    },
    { cueId: 'rain-scent', x: 1.35, y: 1.45, z: -0.25, rotation: 0.035 },
    { cueId: 'through-window', x: -1.4, y: 0.1, z: -0.35, rotation: -0.035 },
    { cueId: 'shifting-light-first', x: 1.4, y: -0.8, z: -0.3, rotation: 0.04 },
    { cueId: 'rain-refrain-first', x: 0, y: -1.55, z: -0.2, rotation: 0 },
    {
      cueId: 'gifted-cd',
      x: 0,
      y: -2.3,
      z: -0.65,
      rotation: -0.015,
    },
    { cueId: 'if-possible', x: -1.4, y: -3.05, z: -0.25, rotation: -0.04 },
    { cueId: 'goodbye', x: 1.25, y: -3.35, z: -0.3, rotation: 0.04 },
  ],
};

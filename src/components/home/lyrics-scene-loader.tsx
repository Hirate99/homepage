'use client';

import dynamic from 'next/dynamic';

import type { SongDefinition } from './songs';

const LyricsScene = dynamic(
  () => import('./lyrics-scene').then((module) => module.LyricsScene),
  {
    ssr: false,
    loading: () => (
      <div
        className="absolute inset-0 bg-[var(--hero-bg)]"
        aria-hidden="true"
      />
    ),
  },
);

export function LyricsSceneLoader({ song }: { song: SongDefinition }) {
  return <LyricsScene song={song} />;
}

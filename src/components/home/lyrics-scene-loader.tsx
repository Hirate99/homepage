'use client';

import dynamic from 'next/dynamic';

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

export function LyricsSceneLoader() {
  return <LyricsScene />;
}

'use client';

import { useRef } from 'react';

import { notoSerif } from '@/fonts';
import { useSongStore } from '@/providers/song-store-provider';

import { useLyricsSceneRuntime } from './lyrics-scene/runtime';

export function LyricsScene() {
  const song = useSongStore((state) => state.song);
  const containerRef = useRef<HTMLDivElement>(null);
  const fontProbeRef = useRef<HTMLSpanElement>(null);

  useLyricsSceneRuntime({ containerRef, fontProbeRef, song });

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 overflow-hidden"
      style={{ backgroundColor: song.colors.background }}
    >
      <span
        ref={fontProbeRef}
        className={`${notoSerif.className} pointer-events-none absolute opacity-0`}
        aria-hidden="true"
      >
        {song.title}
      </span>
    </div>
  );
}

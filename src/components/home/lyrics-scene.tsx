'use client';

import { useRef } from 'react';

import { notoSerif } from '@/fonts';
import { useSongStore } from '@/providers/song-store-provider';

import { useLyricsSceneRuntime } from './lyrics-scene/runtime';
import { useHomeStoryMotion } from './motion';

export function LyricsScene() {
  const song = useSongStore((state) => state.song);
  const { heroProgress } = useHomeStoryMotion();
  const containerRef = useRef<HTMLDivElement>(null);
  const fontProbeRef = useRef<HTMLSpanElement>(null);

  useLyricsSceneRuntime({
    containerRef,
    fontProbeRef,
    song,
    storyProgress: heroProgress,
  });

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

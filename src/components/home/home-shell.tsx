'use client';

import type { CSSProperties, ReactNode } from 'react';

import { useSongStore } from '@/providers/song-store-provider';

import { HomeMotionRoot } from './motion';

export type HomeShellProps = {
  children: ReactNode;
};

export function HomeShell({ children }: HomeShellProps) {
  const song = useSongStore((state) => state.song);
  const shellStyle = {
    backgroundColor: song.colors.background,
    '--motion-accent': song.colors.accent,
    '--motion-glow': `${song.colors.accent}22`,
  } as CSSProperties;

  return (
    <main className="min-w-[280px] overflow-hidden" style={shellStyle}>
      <HomeMotionRoot>{children}</HomeMotionRoot>
    </main>
  );
}

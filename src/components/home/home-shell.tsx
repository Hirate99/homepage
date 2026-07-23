'use client';

import type { ReactNode } from 'react';

import { useSongStore } from '@/providers/song-store-provider';

export type HomeShellProps = {
  children: ReactNode;
};

export function HomeShell({ children }: HomeShellProps) {
  const backgroundColor = useSongStore((state) => state.song.colors.background);

  return (
    <main className="min-w-[280px] overflow-hidden" style={{ backgroundColor }}>
      {children}
    </main>
  );
}

'use client';

import { createContext, type ReactNode, useContext, useState } from 'react';

import { useStore } from 'zustand';

import type { SongDefinition } from '@/components/home/songs';
import {
  createSongStore,
  type SongStore,
  type SongStoreApi,
} from '@/stores/song-store';

const SongStoreContext = createContext<SongStoreApi | null>(null);

export type SongStoreProviderProps = {
  children: ReactNode;
  initialSong: SongDefinition;
};

export function SongStoreProvider({
  children,
  initialSong,
}: SongStoreProviderProps) {
  const [store] = useState(() => createSongStore({ song: initialSong }));

  return (
    <SongStoreContext.Provider value={store}>
      {children}
    </SongStoreContext.Provider>
  );
}

export function useSongStore<T>(selector: (store: SongStore) => T) {
  const store = useContext(SongStoreContext);

  if (!store) {
    throw new Error('useSongStore must be used within SongStoreProvider');
  }

  return useStore(store, selector);
}

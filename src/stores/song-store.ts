import { createStore } from 'zustand/vanilla';

import type { SongDefinition } from '@/components/home/songs';

export type SongStoreState = {
  song: SongDefinition;
};

export type SongStoreActions = {
  setSong: (song: SongDefinition) => void;
};

export type SongStore = SongStoreState & SongStoreActions;
export type SongStoreApi = ReturnType<typeof createSongStore>;

export function createSongStore(initialState: SongStoreState) {
  return createStore<SongStore>()((set) => ({
    ...initialState,
    setSong: (song) => set({ song }),
  }));
}

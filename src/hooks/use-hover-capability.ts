'use client';

import { useSyncExternalStore } from 'react';

const HOVER_CAPABILITY_MEDIA_QUERY = '(hover: hover) and (pointer: fine)';

function subscribe(onStoreChange: () => void) {
  const mediaQuery = window.matchMedia(HOVER_CAPABILITY_MEDIA_QUERY);

  mediaQuery.addEventListener('change', onStoreChange);

  return () => {
    mediaQuery.removeEventListener('change', onStoreChange);
  };
}

function getSnapshot() {
  return window.matchMedia(HOVER_CAPABILITY_MEDIA_QUERY).matches;
}

function getServerSnapshot() {
  return false;
}

export function useHoverCapability() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

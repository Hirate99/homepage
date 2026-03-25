'use client';

import { useEffect, useRef, useSyncExternalStore } from 'react';

import { getBreakpoint, type Breakpoint } from '@/lib/breakpoints';

export interface ViewportSnapshot {
  width: number;
  height: number;
  breakpoint: Breakpoint;
}

const DEFAULT_VIEWPORT_SNAPSHOT: ViewportSnapshot = {
  width: 0,
  height: 0,
  breakpoint: 'md',
};

let currentSnapshot = DEFAULT_VIEWPORT_SNAPSHOT;
const listeners = new Set<() => void>();

function readViewportSnapshot(): ViewportSnapshot {
  const width = window.innerWidth;
  const height = window.innerHeight;

  return {
    width,
    height,
    breakpoint: getBreakpoint(width),
  };
}

function syncViewportSnapshot() {
  const nextSnapshot = readViewportSnapshot();

  if (
    currentSnapshot.width === nextSnapshot.width &&
    currentSnapshot.height === nextSnapshot.height &&
    currentSnapshot.breakpoint === nextSnapshot.breakpoint
  ) {
    return;
  }

  currentSnapshot = nextSnapshot;
  for (const listener of listeners) {
    listener();
  }
}

function subscribe(listener: () => void) {
  if (typeof window === 'undefined') {
    return () => {};
  }

  if (!listeners.size) {
    currentSnapshot = readViewportSnapshot();
    window.addEventListener('resize', syncViewportSnapshot);
  }

  listeners.add(listener);

  return () => {
    listeners.delete(listener);

    if (!listeners.size) {
      window.removeEventListener('resize', syncViewportSnapshot);
    }
  };
}

function getSnapshot() {
  return currentSnapshot;
}

function getServerSnapshot() {
  return DEFAULT_VIEWPORT_SNAPSHOT;
}

export function useViewport() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function useResize(onResize?: () => void, immediate = true) {
  const { width, height } = useViewport();
  const hasRunRef = useRef(false);

  useEffect(() => {
    if (!onResize || width <= 0 || height <= 0) {
      return;
    }

    if (!immediate && !hasRunRef.current) {
      hasRunRef.current = true;
      return;
    }

    hasRunRef.current = true;
    onResize();
  }, [height, immediate, onResize, width]);
}

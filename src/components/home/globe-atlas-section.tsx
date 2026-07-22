'use client';

import { type ComponentType, useEffect, useState } from 'react';

import type { CityPost } from '@/lib/collections';

import { AtlasShell } from './atlas/atlas-shell';
import type { SongDefinition } from './songs';

interface GlobeAtlasSectionProps {
  posts: CityPost[];
  song: SongDefinition;
}

let atlasModulePromise: Promise<typeof import('./globe-atlas')> | null = null;

function loadAtlasModule() {
  atlasModulePromise ??= import('./globe-atlas').catch((error: unknown) => {
    atlasModulePromise = null;
    throw error;
  });
  return atlasModulePromise;
}

export function GlobeAtlasSection({ posts, song }: GlobeAtlasSectionProps) {
  const [shouldLoad, setShouldLoad] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [AtlasComponent, setAtlasComponent] =
    useState<ComponentType<GlobeAtlasSectionProps> | null>(null);

  useEffect(() => {
    const section = document.getElementById('atlas');
    if (!section) {
      return;
    }

    const loadFromHash = () => {
      if (window.location.hash === '#atlas') {
        setShouldLoad(true);
      }
    };

    loadFromHash();
    window.addEventListener('hashchange', loadFromHash);

    if (!('IntersectionObserver' in window)) {
      setShouldLoad(true);
      return () => window.removeEventListener('hashchange', loadFromHash);
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && entry.intersectionRatio > 0) {
          setShouldLoad(true);
          observer.disconnect();
        }
      },
      { rootMargin: '0px 0px -10% 0px', threshold: 0.01 },
    );
    observer.observe(section);

    return () => {
      observer.disconnect();
      window.removeEventListener('hashchange', loadFromHash);
    };
  }, []);

  useEffect(() => {
    if (!shouldLoad || AtlasComponent) {
      return;
    }

    let cancelled = false;
    setStatus('loading');

    void loadAtlasModule()
      .then((module) => {
        if (!cancelled) {
          setAtlasComponent(() => module.GlobeAtlas);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setStatus('error');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [AtlasComponent, attempt, shouldLoad]);

  if (AtlasComponent) {
    return <AtlasComponent posts={posts} song={song} />;
  }

  return (
    <AtlasShell
      posts={posts}
      song={song}
      status={status === 'error' ? 'error' : undefined}
      onRetry={
        status === 'error'
          ? () => {
              setStatus('loading');
              setAttempt((current) => current + 1);
            }
          : undefined
      }
    />
  );
}

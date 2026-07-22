'use client';

import { type ComponentType, useEffect, useState } from 'react';

import type { CityPost } from '@/lib/collections';

import { AtlasShell } from './atlas/atlas-shell';
import { loadGlobeComponent } from './atlas/globe-runtime';
import {
  ATLAS_TEXTURES,
  getAtlasSurfaceTexture,
  getAtlasTheme,
} from './atlas/theme';
import type { SongDefinition } from './songs';

interface GlobeAtlasSectionProps {
  posts: CityPost[];
  song: SongDefinition;
}

let atlasModulePromise: Promise<typeof import('./globe-atlas')> | null = null;
const texturePreloadPromises = new Map<string, Promise<void>>();

function loadAtlasModule() {
  atlasModulePromise ??= import('./globe-atlas').catch((error: unknown) => {
    atlasModulePromise = null;
    throw error;
  });
  return atlasModulePromise;
}

function preloadImage(url: string) {
  return new Promise<void>((resolve) => {
    const image = new Image();
    image.onload = () => resolve();
    image.onerror = () => resolve();
    image.src = url;
  });
}

function preloadAtlasTextures(song: SongDefinition) {
  const theme = getAtlasTheme(song);
  const surfaceTexture = getAtlasSurfaceTexture(
    theme,
    window.innerWidth,
    window.devicePixelRatio,
  );
  const cacheKey = `${surfaceTexture}:${ATLAS_TEXTURES.elevation}`;
  const cachedPromise = texturePreloadPromises.get(cacheKey);

  if (cachedPromise) {
    return cachedPromise;
  }

  const promise = Promise.all([
    preloadImage(surfaceTexture),
    preloadImage(ATLAS_TEXTURES.elevation),
  ]).then(() => undefined);
  texturePreloadPromises.set(cacheKey, promise);
  return promise;
}

async function prepareAtlas(song: SongDefinition) {
  const [module] = await Promise.all([
    loadAtlasModule(),
    loadGlobeComponent(),
    preloadAtlasTextures(song),
  ]);

  return module;
}

export function GlobeAtlasSection({ posts, song }: GlobeAtlasSectionProps) {
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [AtlasComponent, setAtlasComponent] =
    useState<ComponentType<GlobeAtlasSectionProps> | null>(null);

  useEffect(() => {
    if (AtlasComponent) {
      return;
    }

    let cancelled = false;
    setStatus('loading');

    void prepareAtlas(song)
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
  }, [AtlasComponent, attempt, song]);

  if (AtlasComponent) {
    return <AtlasComponent posts={posts} song={song} />;
  }

  return (
    <AtlasShell
      posts={posts}
      song={song}
      status={status === 'idle' ? undefined : status}
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

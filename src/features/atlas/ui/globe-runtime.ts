import type { ComponentType, MutableRefObject } from 'react';
import type { GlobeMethods, GlobeProps } from 'react-globe.gl';

export type GlobeComponentType = ComponentType<
  GlobeProps & { ref?: MutableRefObject<GlobeMethods | undefined> }
>;

let globeComponentPromise: Promise<GlobeComponentType> | null = null;

export function loadGlobeComponent() {
  globeComponentPromise ??= import('react-globe.gl')
    .then((module) => module.default as GlobeComponentType)
    .catch((error: unknown) => {
      globeComponentPromise = null;
      throw error;
    });

  return globeComponentPromise;
}

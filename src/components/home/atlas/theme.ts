import type { CSSProperties } from 'react';

import type { SongDefinition, SongThemeId } from '../songs';

type AtlasCssProperties = CSSProperties &
  Record<`--atlas-${string}`, string | number>;

interface AtlasThemePreset {
  globe: {
    textures: {
      compact: string;
      detailed: string;
    };
    emissive: string;
    bumpScale: number;
    atmosphereAltitude: number;
  };
}

export interface AtlasTheme extends AtlasThemePreset {
  cssVariables: AtlasCssProperties;
  atmosphere: string;
}

const ATLAS_THEME_PRESETS: Record<SongThemeId, AtlasThemePreset> = {
  'california-afterimage': {
    globe: {
      textures: {
        compact: '/images/atlas/earth-california-2k.webp',
        detailed: '/images/atlas/earth-california-4k.webp',
      },
      emissive: '#24170f',
      bumpScale: 0.018,
      atmosphereAltitude: 0.12,
    },
  },
  'rain-night': {
    globe: {
      textures: {
        compact: '/images/atlas/earth-rain-2k.webp',
        detailed: '/images/atlas/earth-rain-4k.webp',
      },
      emissive: '#06121a',
      bumpScale: 0.022,
      atmosphereAltitude: 0.14,
    },
  },
};

export const ATLAS_TEXTURES = {
  elevation: '/images/atlas/earth-elevation-2k.webp',
} as const;

const DETAILED_TEXTURE_MIN_RENDER_WIDTH = 720;

export function getAtlasSurfaceTexture(
  theme: AtlasTheme,
  viewportWidth: number,
  pixelRatio = 1,
) {
  const renderWidth = viewportWidth * Math.max(pixelRatio, 1);

  return renderWidth >= DETAILED_TEXTURE_MIN_RENDER_WIDTH
    ? theme.globe.textures.detailed
    : theme.globe.textures.compact;
}

export function getAtlasTheme(song: SongDefinition): AtlasTheme {
  const preset = ATLAS_THEME_PRESETS[song.theme];

  return {
    ...preset,
    atmosphere: song.colors.accent,
    cssVariables: {
      '--atlas-bg': song.colors.background,
      '--atlas-ink': song.colors.ink,
      '--atlas-accent': song.colors.accent,
      '--atlas-signal': song.colors.signal,
      '--atlas-rule': song.colors.rule,
      '--atlas-muted':
        'color-mix(in srgb, var(--atlas-ink) 64%, var(--atlas-bg))',
      '--atlas-panel':
        'color-mix(in srgb, var(--atlas-bg) 94%, var(--atlas-ink))',
      '--atlas-panel-strong':
        'color-mix(in srgb, var(--atlas-bg) 88%, var(--atlas-ink))',
      '--atlas-card': 'color-mix(in srgb, var(--atlas-bg) 94%, white)',
      '--atlas-card-active':
        'color-mix(in srgb, var(--atlas-bg) 78%, var(--atlas-accent))',
      '--atlas-grid': 'color-mix(in srgb, var(--atlas-rule) 64%, transparent)',
      '--atlas-glow':
        'color-mix(in srgb, var(--atlas-accent) 24%, transparent)',
      '--atlas-signal-glow':
        'color-mix(in srgb, var(--atlas-signal) 22%, transparent)',
      '--atlas-shadow': 'color-mix(in srgb, var(--atlas-ink) 18%, transparent)',
      '--atlas-on-accent': 'color-mix(in srgb, var(--atlas-bg) 12%, white)',
    },
  };
}

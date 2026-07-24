'use client';

import {
  type CSSProperties,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { MapPinned } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { cn } from '@/lib/utils';

import type { CountryNode, MarkerNode } from './model';
import { type AtlasTheme, getAtlasSurfaceTexture } from './theme';

interface CountryMapStageProps {
  country: CountryNode;
  level: 'region' | 'place';
  nodes: MarkerNode[];
  activeMarkerId: string | null;
  hoveredMarkerId: string | null;
  onHoverMarker: (id: string | null) => void;
  onSelectMarker: (id: string) => void;
  theme: AtlasTheme;
}

interface MapExtent {
  minLng: number;
  maxLng: number;
  minLat: number;
  maxLat: number;
  centerLng: number;
}

const DEFAULT_MAP_ASPECT = 16 / 9;

function wrapLongitude(longitude: number) {
  return ((longitude + 540) % 360) - 180;
}

function getLongitudeCenter(nodes: MarkerNode[]) {
  const vector = nodes.reduce(
    (result, node) => {
      const angle = (node.lng * Math.PI) / 180;
      return {
        x: result.x + Math.cos(angle),
        y: result.y + Math.sin(angle),
      };
    },
    { x: 0, y: 0 },
  );

  if (Math.abs(vector.x) < 0.0001 && Math.abs(vector.y) < 0.0001) {
    return wrapLongitude(nodes[0]?.lng ?? 0);
  }

  return (Math.atan2(vector.y, vector.x) * 180) / Math.PI;
}

function unwrapLongitude(longitude: number, center: number) {
  let unwrapped = longitude;
  while (unwrapped - center > 180) {
    unwrapped -= 360;
  }
  while (unwrapped - center < -180) {
    unwrapped += 360;
  }
  return unwrapped;
}

function fitAxis(
  center: number,
  span: number,
  minimum: number,
  maximum: number,
) {
  const availableSpan = maximum - minimum;
  const fittedSpan = Math.min(span, availableSpan);
  const halfSpan = fittedSpan / 2;
  const fittedCenter = Math.min(
    maximum - halfSpan,
    Math.max(minimum + halfSpan, center),
  );

  return {
    min: fittedCenter - halfSpan,
    max: fittedCenter + halfSpan,
  };
}

function getMapExtent(
  nodes: MarkerNode[],
  aspect: number,
  level: CountryMapStageProps['level'],
): MapExtent {
  const centerLng = getLongitudeCenter(nodes);
  const longitudes = nodes.map((node) => unwrapLongitude(node.lng, centerLng));
  const latitudes = nodes.map((node) => node.lat);
  const minLng = Math.min(...longitudes);
  const maxLng = Math.max(...longitudes);
  const minLat = Math.min(...latitudes);
  const maxLat = Math.max(...latitudes);
  const minimumLngSpan = level === 'region' ? 16 : 4.2;
  const minimumLatSpan = level === 'region' ? 11 : 3.2;
  let lngSpan = Math.max(maxLng - minLng, minimumLngSpan) * 1.3;
  let latSpan = Math.max(maxLat - minLat, minimumLatSpan) * 1.3;
  const safeAspect = Math.max(aspect, 0.68);

  if (lngSpan / latSpan < safeAspect) {
    lngSpan = latSpan * safeAspect;
  } else {
    latSpan = lngSpan / safeAspect;
  }

  lngSpan = Math.min(lngSpan, 330);
  latSpan = Math.min(latSpan, 160);

  const longitudeCenter = (minLng + maxLng) / 2;
  const latitudeCenter = (minLat + maxLat) / 2;
  const latitudeRange = fitAxis(latitudeCenter, latSpan, -82, 82);

  return {
    minLng: longitudeCenter - lngSpan / 2,
    maxLng: longitudeCenter + lngSpan / 2,
    minLat: latitudeRange.min,
    maxLat: latitudeRange.max,
    centerLng: longitudeCenter,
  };
}

function getLabelTransform(x: number, y: number) {
  if (x > 74) {
    return 'translate(calc(-100% - 16px), -50%)';
  }
  if (x < 26) {
    return 'translate(16px, -50%)';
  }
  if (y > 74) {
    return 'translate(-50%, calc(-100% - 16px))';
  }
  return 'translate(-50%, 16px)';
}

export function CountryMapStage({
  country,
  level,
  nodes,
  activeMarkerId,
  hoveredMarkerId,
  onHoverMarker,
  onSelectMarker,
  theme,
}: CountryMapStageProps) {
  const t = useTranslations('Atlas');
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewport, setViewport] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const observer = new ResizeObserver(([entry]) => {
      const width = Math.round(entry.contentRect.width);
      const height = Math.round(entry.contentRect.height);
      setViewport((current) =>
        current.width === width && current.height === height
          ? current
          : { width, height },
      );
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  const extent = useMemo(
    () =>
      getMapExtent(
        nodes.length > 0 ? nodes : country.locations,
        viewport.width > 0 && viewport.height > 0
          ? viewport.width / viewport.height
          : DEFAULT_MAP_ASPECT,
        level,
      ),
    [country.locations, level, nodes, viewport.height, viewport.width],
  );
  const lngSpan = extent.maxLng - extent.minLng;
  const latSpan = extent.maxLat - extent.minLat;
  const surfaceTexture = getAtlasSurfaceTexture(
    theme,
    viewport.width,
    typeof window === 'undefined' ? 1 : window.devicePixelRatio,
  );
  const centerTile = Math.round(extent.centerLng / 360);
  const textureTiles = [centerTile - 1, centerTile, centerTile + 1];

  return (
    <div
      ref={containerRef}
      data-slot="atlas-country-map-stage"
      data-level={level}
      className="relative mx-auto h-[min(72svh,570px)] min-h-[430px] w-full overflow-hidden sm:h-[620px] lg:h-[min(68vh,700px)]"
      role="group"
      aria-label={
        level === 'region'
          ? t('interactiveCountryMap', { country: country.label })
          : t('interactivePlaceMap', { country: country.label })
      }
      onPointerLeave={() => onHoverMarker(null)}
    >
      <div className="absolute inset-0 overflow-hidden bg-[var(--atlas-panel-strong)]">
        {textureTiles.map((tile) => (
          <div
            key={tile}
            aria-hidden="true"
            className="absolute max-w-none bg-cover bg-center"
            style={{
              left: `${((tile * 360 - 180 - extent.minLng) / lngSpan) * 100}%`,
              top: `${((extent.maxLat - 90) / latSpan) * 100}%`,
              width: `${(360 / lngSpan) * 100}%`,
              height: `${(180 / latSpan) * 100}%`,
              backgroundImage: `url(${surfaceTexture})`,
              backgroundSize: '100% 100%',
            }}
          />
        ))}
      </div>

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,var(--atlas-grid)_1px,transparent_1px),linear-gradient(to_bottom,var(--atlas-grid)_1px,transparent_1px)] bg-[size:48px_48px] opacity-45 mix-blend-screen"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,transparent_20%,var(--atlas-shadow)_125%)]"
      />

      <div className="pointer-events-none absolute bottom-5 left-5 z-10 hidden items-center gap-3 rounded-full border border-white/15 bg-black/25 px-4 py-2.5 text-white shadow-lg backdrop-blur-md sm:flex">
        <MapPinned className="h-4 w-4" aria-hidden="true" />
        <span className="text-[11px] font-semibold uppercase tracking-[0.16em]">
          {level === 'region' ? t('countryMap') : t('placeMap')}
        </span>
        <span className="h-3 w-px bg-white/25" aria-hidden="true" />
        <span className="text-xs text-white/80">{country.label}</span>
      </div>

      <div className="pointer-events-none absolute inset-0 z-20">
        {nodes.map((node) => {
          const longitude = unwrapLongitude(node.lng, extent.centerLng);
          const x = ((longitude - extent.minLng) / lngSpan) * 100;
          const y = ((extent.maxLat - node.lat) / latSpan) * 100;
          const isActive = node.id === activeMarkerId;
          const isHovered = node.id === hoveredMarkerId;
          const shouldShowLabel = isActive || isHovered;

          return (
            <button
              key={node.id}
              type="button"
              data-marker-button="true"
              data-node-id={node.id}
              data-state={isActive ? 'active' : 'idle'}
              className="pointer-events-auto absolute z-20 grid h-11 w-11 -translate-x-1/2 -translate-y-1/2 place-items-center overflow-visible rounded-full outline-none focus-visible:ring-2 focus-visible:ring-[var(--atlas-on-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--atlas-accent)]"
              style={
                {
                  left: `${x}%`,
                  top: `${y}%`,
                  '--marker-label-transform': getLabelTransform(x, y),
                } as CSSProperties
              }
              onMouseEnter={() => onHoverMarker(node.id)}
              onMouseLeave={() => onHoverMarker(null)}
              onFocus={() => onHoverMarker(node.id)}
              onBlur={() => onHoverMarker(null)}
              onClick={() => onSelectMarker(node.id)}
              aria-label={node.label}
            >
              <span
                aria-hidden="true"
                className={cn(
                  'absolute h-3 w-3 rounded-full border border-[var(--atlas-on-accent)] bg-[var(--atlas-accent)] shadow-[0_0_0_6px_var(--atlas-glow)] transition',
                  isActive && 'h-4 w-4 shadow-[0_0_0_10px_var(--atlas-glow)]',
                  isHovered && 'scale-125',
                )}
              />
              <span
                aria-hidden="true"
                className={cn(
                  'absolute h-8 w-8 rounded-full border border-[var(--atlas-accent)] bg-[var(--atlas-glow)] opacity-0 transition duration-300',
                  (isActive || isHovered) && 'animate-pulse opacity-100',
                )}
              />
              <span
                className={cn(
                  'absolute left-1/2 top-1/2 z-30 flex items-center gap-2 rounded-lg border border-[var(--atlas-rule)] bg-[var(--atlas-card)] px-3 py-2 text-sm font-medium text-[var(--atlas-ink)] shadow-lg shadow-[var(--atlas-shadow)] backdrop-blur-md transition [transform:var(--marker-label-transform)]',
                  shouldShowLabel
                    ? 'opacity-100'
                    : 'pointer-events-none opacity-0',
                )}
              >
                {node.count > 1 && (
                  <span className="grid h-5 min-w-5 place-items-center rounded-full bg-[var(--atlas-glow)] px-1.5 text-[11px] font-semibold text-[var(--atlas-accent)]">
                    {node.count}
                  </span>
                )}
                <span className="whitespace-nowrap">{node.label}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

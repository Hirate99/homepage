'use client';

import { useEffect, useRef, useState } from 'react';

import { Minus, Plus } from 'lucide-react';
import type {
  GeoJSONSource,
  Map as MapLibreMap,
  Marker as MapLibreMarker,
} from 'maplibre-gl';
import { useTranslations } from 'next-intl';

import { cn } from '@/lib/utils';

import type { CountryNode, LocationNode } from '@/features/atlas/model/atlas';

interface CountryMapStageProps {
  country: CountryNode;
  level: 'region' | 'place';
  nodes: LocationNode[];
  mapTextures: {
    compact: string;
    detailed: string;
  };
  detailRaster: {
    saturation: number;
    contrast: number;
    brightnessMin: number;
    brightnessMax: number;
    hueRotate: number;
  };
  accentColor: string;
  activeMarkerId: string | null;
  onHoverMarker: (id: string | null) => void;
  onSelectMarker: (id: string, element?: HTMLButtonElement) => void;
  onExitToWorld: () => void;
  reduceMotion: boolean;
}

type MapLibreModule = typeof import('maplibre-gl');

declare global {
  interface Window {
    __ATLAS_MAPLIBRE__?: MapLibreModule;
  }
}

const TILE_URL =
  process.env.NEXT_PUBLIC_ATLAS_TILE_URL ??
  'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const LAND_DATA_URL = '/vendor/atlas/ne_110m_land.geojson';
const MAPLIBRE_MODULE_URL = '/vendor/maplibre/maplibre-loader.mjs';
const MAPLIBRE_STYLESHEET_URL = '/vendor/maplibre/maplibre-gl.css';
const LOCATION_SOURCE_ID = 'atlas-locations';
const LOCATION_CLUSTER_LAYER_ID = 'atlas-location-clusters';
const LOCATION_POINT_HIT_LAYER_ID = 'atlas-location-point-hit-area';
const LOCATION_POINT_LAYER_ID = 'atlas-location-points';
const LOCATION_ACTIVE_LAYER_ID = 'atlas-location-active';
const LOCAL_DETAIL_MIN_ZOOM = 5.5;
const COUNTRY_EXIT_ZOOM_DELTA = 0.72;
const WEB_MERCATOR_IMAGE_COORDINATES = [
  [-180, 85.0511287798],
  [180, 85.0511287798],
  [180, -85.0511287798],
  [-180, -85.0511287798],
] as [[number, number], [number, number], [number, number], [number, number]];
const COUNTRY_MAP_CONTROL_CLASSNAME =
  'grid h-11 w-11 touch-manipulation place-items-center text-[var(--atlas-ink)] outline-none transition-colors hover:bg-[var(--atlas-accent)] hover:text-[var(--atlas-on-accent)] focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--atlas-accent)]';

let mapLibrePromise: Promise<MapLibreModule> | null = null;

function loadStylesheet() {
  const existing = document.querySelector<HTMLLinkElement>(
    'link[data-atlas-maplibre-styles]',
  );

  if (existing?.dataset.loaded === 'true' || existing?.sheet) {
    return Promise.resolve();
  }

  return new Promise<void>((resolve, reject) => {
    const link = existing ?? document.createElement('link');
    const handleLoad = () => {
      link.dataset.loaded = 'true';
      resolve();
    };
    const handleError = () =>
      reject(new Error('Unable to load the self-hosted MapLibre stylesheet.'));

    link.addEventListener('load', handleLoad, { once: true });
    link.addEventListener('error', handleError, { once: true });

    if (!existing) {
      link.rel = 'stylesheet';
      link.href = MAPLIBRE_STYLESHEET_URL;
      link.dataset.atlasMaplibreStyles = 'true';
      document.head.appendChild(link);
    }
  });
}

function loadMapLibre() {
  if (window.__ATLAS_MAPLIBRE__) {
    return Promise.resolve(window.__ATLAS_MAPLIBRE__);
  }

  if (mapLibrePromise) {
    return mapLibrePromise;
  }

  mapLibrePromise = Promise.all([
    loadStylesheet(),
    new Promise<void>((resolve, reject) => {
      const existing = document.querySelector<HTMLScriptElement>(
        'script[data-atlas-maplibre-module]',
      );
      const script = existing ?? document.createElement('script');
      const handleLoad = () => resolve();
      const handleError = () =>
        reject(new Error('Unable to load the self-hosted MapLibre module.'));

      script.addEventListener('load', handleLoad, { once: true });
      script.addEventListener('error', handleError, { once: true });

      if (!existing) {
        script.type = 'module';
        script.src = MAPLIBRE_MODULE_URL;
        script.dataset.atlasMaplibreModule = 'true';
        document.head.appendChild(script);
      }
    }),
  ])
    .then(() => {
      if (!window.__ATLAS_MAPLIBRE__) {
        throw new Error('The self-hosted MapLibre module did not initialize.');
      }

      return window.__ATLAS_MAPLIBRE__;
    })
    .catch((error: unknown) => {
      mapLibrePromise = null;
      throw error;
    });

  return mapLibrePromise;
}

function fitCountry(
  map: MapLibreMap,
  country: CountryNode,
  reduceMotion: boolean,
) {
  const horizontalPadding = Math.max(
    24,
    Math.min(56, map.getContainer().clientWidth * 0.07),
  );
  const verticalPadding = Math.max(
    52,
    Math.min(72, map.getContainer().clientHeight * 0.09),
  );
  const camera = map.cameraForBounds(country.bounds, {
    padding: {
      top: verticalPadding,
      right: horizontalPadding,
      bottom: verticalPadding,
      left: horizontalPadding,
    },
  });
  const zoom = camera?.zoom ?? 2;

  map.easeTo({
    center: camera?.center ?? [country.lng, country.lat],
    zoom,
    duration: reduceMotion ? 0 : 1050,
  });

  return zoom;
}

function createLocationData(nodes: LocationNode[]) {
  return {
    type: 'FeatureCollection' as const,
    features: nodes.map((node) => ({
      type: 'Feature' as const,
      geometry: {
        type: 'Point' as const,
        coordinates: [node.lng, node.lat],
      },
      properties: {
        id: node.id,
        label: node.label,
      },
    })),
  };
}

function createLocationLabelElement(label: string) {
  const element = document.createElement('span');
  element.textContent = label;
  element.setAttribute('aria-hidden', 'true');
  Object.assign(element.style, {
    backdropFilter: 'blur(14px)',
    background: 'color-mix(in srgb, var(--atlas-card) 92%, transparent)',
    border: '1px solid var(--atlas-rule)',
    borderRadius: '10px',
    boxShadow: '0 10px 28px var(--atlas-shadow)',
    color: 'var(--atlas-ink)',
    fontSize: '13px',
    fontWeight: '600',
    padding: '8px 11px',
    pointerEvents: 'none',
    whiteSpace: 'nowrap',
  });

  return element;
}

export function CountryMapStage({
  country,
  level,
  nodes,
  mapTextures,
  detailRaster,
  accentColor,
  activeMarkerId,
  onHoverMarker,
  onSelectMarker,
  onExitToWorld,
  reduceMotion,
}: CountryMapStageProps) {
  const t = useTranslations('Atlas');
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const labelMarkerRef = useRef<MapLibreMarker | null>(null);
  const syncLocationLabelRef = useRef<(() => void) | null>(null);
  const nodesRef = useRef(nodes);
  const activeMarkerIdRef = useRef(activeMarkerId);
  const hoveredMarkerIdRef = useRef<string | null>(null);
  const selectMarkerRef = useRef(onSelectMarker);
  const exitToWorldRef = useRef(onExitToWorld);
  const hasRequestedWorldExitRef = useRef(false);
  const worldExitZoomRef = useRef(1);
  const hoverMarkerRef = useRef(onHoverMarker);
  const reduceMotionRef = useRef(reduceMotion);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasTileError, setHasTileError] = useState(false);

  useEffect(() => {
    nodesRef.current = nodes;
    const map = mapRef.current;
    const source = map?.getSource(LOCATION_SOURCE_ID) as
      | GeoJSONSource
      | undefined;
    source?.setData(createLocationData(nodes));
    syncLocationLabelRef.current?.();
  }, [nodes]);

  useEffect(() => {
    activeMarkerIdRef.current = activeMarkerId;
    const map = mapRef.current;
    if (map?.getLayer(LOCATION_ACTIVE_LAYER_ID)) {
      map.setFilter(LOCATION_ACTIVE_LAYER_ID, [
        '==',
        ['get', 'id'],
        activeMarkerId ?? '',
      ]);
    }
    syncLocationLabelRef.current?.();
  }, [activeMarkerId]);

  useEffect(() => {
    selectMarkerRef.current = onSelectMarker;
  }, [onSelectMarker]);

  useEffect(() => {
    exitToWorldRef.current = onExitToWorld;
  }, [onExitToWorld]);

  useEffect(() => {
    hoverMarkerRef.current = onHoverMarker;
  }, [onHoverMarker]);

  useEffect(() => {
    reduceMotionRef.current = reduceMotion;
  }, [reduceMotion]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    let isCancelled = false;
    let resizeFrame = 0;

    setIsLoaded(false);
    setHasTileError(false);
    hasRequestedWorldExitRef.current = false;

    void loadMapLibre()
      .then((maplibre) => {
        if (isCancelled || !containerRef.current) {
          return;
        }

        const firstNode = nodesRef.current[0];
        const texture =
          container.clientWidth * Math.max(window.devicePixelRatio || 1, 1) >=
          720
            ? mapTextures.detailed
            : mapTextures.compact;
        const map = new maplibre.Map({
          container: containerRef.current,
          style: {
            version: 8,
            sources: {
              atlasTerrain: {
                type: 'image',
                url: texture,
                coordinates: WEB_MERCATOR_IMAGE_COORDINATES,
              },
              atlasLand: {
                type: 'geojson',
                data: LAND_DATA_URL,
              },
              osm: {
                type: 'raster',
                tiles: [TILE_URL],
                tileSize: 256,
                attribution:
                  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
              },
              [LOCATION_SOURCE_ID]: {
                type: 'geojson',
                data: createLocationData(nodesRef.current),
                cluster: true,
                clusterMaxZoom: 10,
                clusterRadius: 32,
              },
            },
            layers: [
              {
                id: 'atlas-ocean',
                type: 'background',
                paint: {
                  'background-color': '#07151d',
                },
              },
              {
                id: 'atlas-terrain',
                type: 'raster',
                source: 'atlasTerrain',
                paint: {
                  'raster-fade-duration': 0,
                  'raster-opacity': [
                    'interpolate',
                    ['linear'],
                    ['zoom'],
                    1,
                    1,
                    LOCAL_DETAIL_MIN_ZOOM,
                    0.92,
                    LOCAL_DETAIL_MIN_ZOOM + 1.5,
                    0,
                  ],
                },
              },
              {
                id: 'atlas-land',
                type: 'fill',
                source: 'atlasLand',
                paint: {
                  'fill-color': '#f3f7f4',
                  'fill-opacity': [
                    'interpolate',
                    ['linear'],
                    ['zoom'],
                    1,
                    0.025,
                    LOCAL_DETAIL_MIN_ZOOM,
                    0.07,
                    LOCAL_DETAIL_MIN_ZOOM + 1.5,
                    0,
                  ],
                },
              },
              {
                id: 'atlas-coastline',
                type: 'line',
                source: 'atlasLand',
                paint: {
                  'line-color': '#d4e2df',
                  'line-opacity': [
                    'interpolate',
                    ['linear'],
                    ['zoom'],
                    1,
                    0.16,
                    LOCAL_DETAIL_MIN_ZOOM,
                    0.34,
                    LOCAL_DETAIL_MIN_ZOOM + 1.5,
                    0,
                  ],
                  'line-width': [
                    'interpolate',
                    ['linear'],
                    ['zoom'],
                    1,
                    0.5,
                    7,
                    1.25,
                  ],
                },
              },
              {
                id: 'osm',
                type: 'raster',
                source: 'osm',
                minzoom: LOCAL_DETAIL_MIN_ZOOM,
                paint: {
                  'raster-brightness-max': detailRaster.brightnessMax,
                  'raster-brightness-min': detailRaster.brightnessMin,
                  'raster-contrast': detailRaster.contrast,
                  'raster-fade-duration': 180,
                  'raster-hue-rotate': detailRaster.hueRotate,
                  'raster-opacity': [
                    'interpolate',
                    ['linear'],
                    ['zoom'],
                    LOCAL_DETAIL_MIN_ZOOM,
                    0,
                    LOCAL_DETAIL_MIN_ZOOM + 1.5,
                    1,
                  ],
                  'raster-saturation': detailRaster.saturation,
                },
              },
              {
                id: 'atlas-location-cluster-glow',
                type: 'circle',
                source: LOCATION_SOURCE_ID,
                filter: ['has', 'point_count'],
                paint: {
                  'circle-color': accentColor,
                  'circle-opacity': 0.18,
                  'circle-radius': [
                    'step',
                    ['get', 'point_count'],
                    20,
                    5,
                    25,
                    20,
                    31,
                  ],
                },
              },
              {
                id: LOCATION_CLUSTER_LAYER_ID,
                type: 'circle',
                source: LOCATION_SOURCE_ID,
                filter: ['has', 'point_count'],
                paint: {
                  'circle-color': accentColor,
                  'circle-radius': [
                    'step',
                    ['get', 'point_count'],
                    10,
                    5,
                    13,
                    20,
                    16,
                  ],
                  'circle-stroke-color': '#eef6f3',
                  'circle-stroke-opacity': 0.88,
                  'circle-stroke-width': 1.5,
                },
              },
              {
                id: 'atlas-location-point-glow',
                type: 'circle',
                source: LOCATION_SOURCE_ID,
                filter: ['!', ['has', 'point_count']],
                paint: {
                  'circle-color': accentColor,
                  'circle-opacity': 0.2,
                  'circle-radius': 13,
                },
              },
              {
                id: LOCATION_POINT_HIT_LAYER_ID,
                type: 'circle',
                source: LOCATION_SOURCE_ID,
                filter: ['!', ['has', 'point_count']],
                paint: {
                  'circle-color': accentColor,
                  'circle-opacity': 0.01,
                  'circle-radius': 22,
                },
              },
              {
                id: LOCATION_POINT_LAYER_ID,
                type: 'circle',
                source: LOCATION_SOURCE_ID,
                filter: ['!', ['has', 'point_count']],
                paint: {
                  'circle-color': accentColor,
                  'circle-radius': 5.5,
                  'circle-stroke-color': '#eef6f3',
                  'circle-stroke-opacity': 0.9,
                  'circle-stroke-width': 1.25,
                },
              },
              {
                id: LOCATION_ACTIVE_LAYER_ID,
                type: 'circle',
                source: LOCATION_SOURCE_ID,
                filter: ['==', ['get', 'id'], activeMarkerIdRef.current ?? ''],
                paint: {
                  'circle-color': accentColor,
                  'circle-radius': 8,
                  'circle-stroke-color': '#eef6f3',
                  'circle-stroke-width': 2,
                },
              },
            ],
          },
          center: firstNode ? [firstNode.lng, firstNode.lat] : [0, 24],
          zoom: firstNode ? 5 : 1.5,
          maxZoom: 17,
          minZoom: 0.5,
          attributionControl: false,
          dragRotate: false,
          pitchWithRotate: false,
          touchPitch: false,
          touchZoomRotate: true,
          scrollZoom: true,
          cooperativeGestures: false,
        });

        mapRef.current = map;
        map.touchZoomRotate.disableRotation();
        let isUserZoom = false;

        const requestWorldExit = () => {
          if (hasRequestedWorldExitRef.current) {
            return;
          }

          hasRequestedWorldExitRef.current = true;
          exitToWorldRef.current();
        };

        map.on('zoomstart', (event) => {
          isUserZoom = Boolean(event.originalEvent);
        });
        map.on('zoomend', () => {
          if (map.getZoom() > worldExitZoomRef.current) {
            hasRequestedWorldExitRef.current = false;
            isUserZoom = false;
            return;
          }

          if (isUserZoom) {
            requestWorldExit();
          }
          isUserZoom = false;
        });

        const syncLocationLabel = () => {
          labelMarkerRef.current?.remove();
          labelMarkerRef.current = null;

          const markerId =
            hoveredMarkerIdRef.current ?? activeMarkerIdRef.current;
          const node = nodesRef.current.find((item) => item.id === markerId);
          if (!node) {
            return;
          }

          const placeOnLeft =
            map.project([node.lng, node.lat]).x >
            map.getContainer().clientWidth - 170;

          labelMarkerRef.current = new maplibre.Marker({
            element: createLocationLabelElement(node.label),
            anchor: placeOnLeft ? 'right' : 'left',
            offset: placeOnLeft ? [-14, 0] : [14, 0],
          })
            .setLngLat([node.lng, node.lat])
            .addTo(map);
        };

        syncLocationLabelRef.current = syncLocationLabel;

        const setHoveredLocation = (id: string | null) => {
          if (hoveredMarkerIdRef.current === id) {
            return;
          }

          hoveredMarkerIdRef.current = id;
          hoverMarkerRef.current(id);
          syncLocationLabel();
        };

        map.on('mouseenter', LOCATION_POINT_HIT_LAYER_ID, (event) => {
          map.getCanvas().style.cursor = 'pointer';
          const id = event.features?.[0]?.properties?.id;
          setHoveredLocation(typeof id === 'string' ? id : null);
        });
        map.on('mouseleave', LOCATION_POINT_HIT_LAYER_ID, () => {
          map.getCanvas().style.cursor = '';
          setHoveredLocation(null);
        });
        map.on('click', LOCATION_POINT_HIT_LAYER_ID, (event) => {
          const id = event.features?.[0]?.properties?.id;
          if (typeof id === 'string') {
            selectMarkerRef.current(id);
          }
        });
        map.on('mouseenter', LOCATION_CLUSTER_LAYER_ID, () => {
          map.getCanvas().style.cursor = 'pointer';
        });
        map.on('mouseleave', LOCATION_CLUSTER_LAYER_ID, () => {
          map.getCanvas().style.cursor = '';
        });
        map.on('click', LOCATION_CLUSTER_LAYER_ID, (event) => {
          const feature = event.features?.[0];
          const clusterId = feature?.properties?.cluster_id;
          if (
            typeof clusterId !== 'number' ||
            feature?.geometry.type !== 'Point'
          ) {
            return;
          }

          const source = map.getSource(LOCATION_SOURCE_ID) as GeoJSONSource;
          const [lng, lat] = feature.geometry.coordinates;
          void source.getClusterExpansionZoom(clusterId).then((zoom) => {
            map.easeTo({
              center: [lng, lat],
              zoom,
              duration: reduceMotionRef.current ? 0 : 420,
            });
          });
        });

        map.on('load', () => {
          if (isCancelled) {
            return;
          }

          const entryZoom = fitCountry(map, country, reduceMotionRef.current);
          worldExitZoomRef.current = Math.max(
            map.getMinZoom() + 0.05,
            entryZoom - COUNTRY_EXIT_ZOOM_DELTA,
          );
          syncLocationLabel();
          setIsLoaded(true);
        });

        const resizeObserver = new ResizeObserver(() => {
          window.cancelAnimationFrame(resizeFrame);
          resizeFrame = window.requestAnimationFrame(() => map.resize());
        });
        resizeObserver.observe(container);

        map.on('error', (event) => {
          if (
            typeof event.error?.message === 'string' &&
            /tile|raster|network|fetch/i.test(event.error.message)
          ) {
            setHasTileError(true);
          }
        });

        map.once('remove', () => resizeObserver.disconnect());
      })
      .catch(() => {
        if (!isCancelled) {
          setHasTileError(true);
          setIsLoaded(true);
        }
      });

    return () => {
      isCancelled = true;
      window.cancelAnimationFrame(resizeFrame);
      syncLocationLabelRef.current = null;
      labelMarkerRef.current?.remove();
      labelMarkerRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [accentColor, country, detailRaster, mapTextures]);

  useEffect(() => {
    const map = mapRef.current;
    const activeNode = nodes.find((node) => node.id === activeMarkerId);
    if (!map || level !== 'place' || !activeNode) {
      return;
    }

    map.easeTo({
      center: [activeNode.lng, activeNode.lat],
      zoom: Math.max(map.getZoom(), 9),
      duration: reduceMotion ? 0 : 700,
    });
  }, [activeMarkerId, level, nodes, reduceMotion]);

  return (
    <div
      data-slot="atlas-country-map-stage"
      data-level={level}
      className="relative h-full min-h-[360px] w-full overflow-hidden bg-[var(--atlas-panel-strong)]"
      role="group"
      aria-label={t('interactiveCountryMap', { country: country.label })}
    >
      <div
        ref={containerRef}
        className={cn(
          'absolute inset-0 origin-center transition duration-700 ease-out',
          isLoaded ? 'scale-100 opacity-100' : 'scale-[1.035] opacity-0',
        )}
        style={{ position: 'absolute', inset: 0 }}
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-10 opacity-40"
        style={{
          background:
            'radial-gradient(circle at 50% 44%, transparent 0%, transparent 52%, color-mix(in srgb, var(--atlas-bg) 44%, transparent) 100%)',
          boxShadow: 'inset 0 0 72px var(--atlas-shadow)',
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-10 bg-[linear-gradient(to_right,var(--atlas-grid)_1px,transparent_1px),linear-gradient(to_bottom,var(--atlas-grid)_1px,transparent_1px)] bg-[size:48px_48px] opacity-15"
      />

      <div
        className={cn(
          'pointer-events-none absolute inset-0 z-20 grid place-items-center bg-[var(--atlas-panel-strong)] transition duration-500',
          isLoaded ? 'invisible opacity-0' : 'visible opacity-100',
        )}
        role={isLoaded ? undefined : 'status'}
        aria-hidden={isLoaded}
        aria-label={
          isLoaded
            ? undefined
            : t('loadingCountryMap', { country: country.label })
        }
      >
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[var(--atlas-rule)] border-t-[var(--atlas-accent)] motion-reduce:animate-none" />
      </div>

      <div className="pointer-events-none absolute inset-x-3 bottom-3 z-30 flex items-end justify-between gap-3 sm:inset-x-4 sm:bottom-4">
        <div className="bg-[var(--atlas-card)]/86 pointer-events-auto flex items-center gap-1.5 rounded-full border border-[var(--atlas-rule)] px-2.5 py-1 text-[9px] font-medium text-[var(--atlas-muted)] shadow-md shadow-[var(--atlas-shadow)] backdrop-blur-md">
          <a
            href="https://www.naturalearthdata.com/"
            target="_blank"
            rel="noreferrer"
            className="rounded-sm outline-none transition-colors hover:text-[var(--atlas-ink)] focus-visible:ring-2 focus-visible:ring-[var(--atlas-accent)]"
          >
            Natural Earth
          </a>
          <span aria-hidden="true">·</span>
          <a
            href="https://www.openstreetmap.org/copyright"
            target="_blank"
            rel="noreferrer"
            className="rounded-sm outline-none transition-colors hover:text-[var(--atlas-ink)] focus-visible:ring-2 focus-visible:ring-[var(--atlas-accent)]"
          >
            © OpenStreetMap
          </a>
        </div>

        <div className="pointer-events-auto flex shrink-0 flex-col items-end">
          <div className="bg-[var(--atlas-card)]/88 flex overflow-hidden rounded-xl border border-[var(--atlas-rule)] shadow-lg shadow-[var(--atlas-shadow)] backdrop-blur-md">
            <button
              type="button"
              className={cn(
                COUNTRY_MAP_CONTROL_CLASSNAME,
                'border-r border-[var(--atlas-rule)]',
              )}
              onClick={() => {
                const map = mapRef.current;
                if (!map) {
                  return;
                }

                const nextZoom = Math.max(map.getZoom() - 1, map.getMinZoom());
                if (nextZoom <= worldExitZoomRef.current) {
                  if (!hasRequestedWorldExitRef.current) {
                    hasRequestedWorldExitRef.current = true;
                    exitToWorldRef.current();
                  }
                  return;
                }

                map.easeTo({
                  zoom: nextZoom,
                  duration: reduceMotion ? 0 : 360,
                });
              }}
              aria-label={t('zoomOut')}
              title={t('zoomOut')}
            >
              <Minus className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              className={COUNTRY_MAP_CONTROL_CLASSNAME}
              onClick={() => {
                const map = mapRef.current;
                if (!map) {
                  return;
                }

                const activeNode = nodesRef.current.find(
                  (node) => node.id === activeMarkerIdRef.current,
                );
                map.easeTo({
                  center: activeNode
                    ? [activeNode.lng, activeNode.lat]
                    : map.getCenter(),
                  zoom: Math.min(map.getZoom() + 1, map.getMaxZoom()),
                  duration: reduceMotion ? 0 : 360,
                });
              }}
              aria-label={t('zoomIn')}
              title={t('zoomIn')}
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      {hasTileError && (
        <p
          className="bg-[var(--atlas-card)]/95 absolute left-1/2 top-20 z-30 w-[min(90%,420px)] -translate-x-1/2 rounded-xl border border-[var(--atlas-rule)] px-4 py-3 text-center text-xs font-medium text-[var(--atlas-ink)] shadow-lg backdrop-blur-md"
          role="status"
        >
          {t('mapTilesUnavailable')}
        </p>
      )}
    </div>
  );
}

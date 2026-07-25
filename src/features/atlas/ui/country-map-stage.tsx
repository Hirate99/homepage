'use client';

import { useEffect, useRef, useState } from 'react';

import { Minus, Plus } from 'lucide-react';
import type { Map as MapLibreMap, Marker as MapLibreMarker } from 'maplibre-gl';
import { useTranslations } from 'next-intl';

import { cn } from '@/lib/utils';

import type { CountryNode, LocationNode } from '@/features/atlas/model/atlas';

interface CountryMapStageProps {
  country: CountryNode;
  level: 'region' | 'place';
  nodes: LocationNode[];
  activeMarkerId: string | null;
  onHoverMarker: (id: string | null) => void;
  onSelectMarker: (id: string, element?: HTMLButtonElement) => void;
  onExitToWorld: () => void;
  reduceMotion: boolean;
}

interface MarkerGroup {
  nodes: LocationNode[];
  lat: number;
  lng: number;
  screenX: number;
  screenY: number;
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
const CLUSTER_CELL_SIZE = 54;
const WORLD_EXIT_ZOOM = 1.8;
const COUNTRY_MIN_ZOOM = 2.15;
const LOCAL_DETAIL_MIN_ZOOM = 7;
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
  const camera = map.cameraForBounds(country.bounds, {
    padding: { top: 72, right: 56, bottom: 72, left: 56 },
  });

  map.easeTo({
    center: camera?.center ?? [country.lng, country.lat],
    zoom: Math.max(camera?.zoom ?? COUNTRY_MIN_ZOOM, COUNTRY_MIN_ZOOM),
    duration: reduceMotion ? 0 : 1050,
  });
}

function groupVisibleNodes(map: MapLibreMap, nodes: LocationNode[]) {
  const container = map.getContainer();
  const groups = new Map<string, MarkerGroup>();

  for (const node of nodes) {
    const point = map.project([node.lng, node.lat]);
    if (
      point.x < -CLUSTER_CELL_SIZE ||
      point.y < -CLUSTER_CELL_SIZE ||
      point.x > container.clientWidth + CLUSTER_CELL_SIZE ||
      point.y > container.clientHeight + CLUSTER_CELL_SIZE
    ) {
      continue;
    }

    const key = `${Math.floor(point.x / CLUSTER_CELL_SIZE)}:${Math.floor(
      point.y / CLUSTER_CELL_SIZE,
    )}`;
    const group = groups.get(key);

    if (group) {
      group.nodes.push(node);
      continue;
    }

    groups.set(key, {
      nodes: [node],
      lat: node.lat,
      lng: node.lng,
      screenX: point.x,
      screenY: point.y,
    });
  }

  return [...groups.values()].map((group) => {
    if (group.nodes.length === 1) {
      return group;
    }

    const projectedNodes = group.nodes.map((node) => ({
      node,
      point: map.project([node.lng, node.lat]),
    }));
    const center = projectedNodes.reduce(
      (total, item) => ({
        x: total.x + item.point.x / projectedNodes.length,
        y: total.y + item.point.y / projectedNodes.length,
      }),
      { x: 0, y: 0 },
    );
    const anchor = projectedNodes.reduce((closest, item) =>
      Math.hypot(item.point.x - center.x, item.point.y - center.y) <
      Math.hypot(closest.point.x - center.x, closest.point.y - center.y)
        ? item
        : closest,
    );

    return {
      ...group,
      lat: anchor.node.lat,
      lng: anchor.node.lng,
      screenX: anchor.point.x,
      screenY: anchor.point.y,
    };
  });
}

function setMarkerLabelVisible(label: HTMLSpanElement, visible: boolean) {
  label.style.opacity = visible ? '1' : '0';
  label.style.transform = visible
    ? (label.dataset.visibleTransform ?? 'translate(0, -50%)')
    : `${label.dataset.visibleTransform ?? 'translate(0, -50%)'} scale(.94)`;
}

function createLocationMarkerElement({
  group,
  map,
  activeMarkerId,
  onHoverMarker,
  onSelectMarker,
  reduceMotion,
  clusterLabel,
}: {
  group: MarkerGroup;
  map: MapLibreMap;
  activeMarkerId: string | null;
  onHoverMarker: (id: string | null) => void;
  onSelectMarker: (id: string, element?: HTMLButtonElement) => void;
  reduceMotion: boolean;
  clusterLabel: (count: number) => string;
}) {
  const button = document.createElement('button');
  const core = document.createElement('span');
  const isCluster = group.nodes.length > 1;
  const singleNode = group.nodes[0];
  const isActive = !isCluster && singleNode.id === activeMarkerId;

  button.type = 'button';
  button.dataset.atlasMapMarker = isCluster ? 'cluster' : singleNode.id;
  button.setAttribute(
    'aria-label',
    isCluster ? clusterLabel(group.nodes.length) : singleNode.label,
  );
  Object.assign(button.style, {
    appearance: 'none',
    background: 'transparent',
    border: '0',
    borderRadius: '999px',
    cursor: 'pointer',
    display: 'grid',
    height: '44px',
    outline: 'none',
    placeItems: 'center',
    position: 'relative',
    width: '44px',
  });

  Object.assign(core.style, {
    alignItems: 'center',
    background: 'var(--atlas-accent)',
    border: '1px solid var(--atlas-on-accent)',
    borderRadius: '999px',
    boxShadow: isActive
      ? '0 0 0 10px var(--atlas-glow), 0 10px 28px var(--atlas-shadow)'
      : '0 0 0 6px var(--atlas-glow), 0 8px 22px var(--atlas-shadow)',
    color: 'var(--atlas-on-accent)',
    display: 'flex',
    fontSize: '11px',
    fontWeight: '700',
    height: isCluster ? '32px' : isActive ? '16px' : '12px',
    justifyContent: 'center',
    minWidth: isCluster ? '32px' : isActive ? '16px' : '12px',
    transition: reduceMotion
      ? 'none'
      : 'transform 180ms ease, box-shadow 220ms ease',
  });

  button.addEventListener('focus', () => {
    button.style.outline = '2px solid var(--atlas-accent)';
    button.style.outlineOffset = '2px';
  });
  button.addEventListener('blur', () => {
    button.style.outline = 'none';
  });

  if (isCluster) {
    core.textContent = String(group.nodes.length);
    button.appendChild(core);
    button.addEventListener('click', () => {
      const longitudes = group.nodes.map((node) => node.lng);
      const latitudes = group.nodes.map((node) => node.lat);
      map.fitBounds(
        [
          [Math.min(...longitudes), Math.min(...latitudes)],
          [Math.max(...longitudes), Math.max(...latitudes)],
        ],
        {
          padding: 72,
          maxZoom: Math.min(map.getZoom() + 2, 14),
          duration: reduceMotion ? 0 : 620,
        },
      );
    });
    return button;
  }

  const label = document.createElement('span');
  const shouldPlaceLeft = group.screenX > map.getContainer().clientWidth - 180;
  const visibleTransform = shouldPlaceLeft
    ? 'translate(-100%, -50%)'
    : 'translate(0, -50%)';
  label.textContent = singleNode.label;
  label.dataset.visibleTransform = visibleTransform;
  Object.assign(label.style, {
    backdropFilter: 'blur(14px)',
    background: 'color-mix(in srgb, var(--atlas-card) 92%, transparent)',
    border: '1px solid var(--atlas-rule)',
    borderRadius: '10px',
    boxShadow: '0 10px 28px var(--atlas-shadow)',
    color: 'var(--atlas-ink)',
    fontSize: '13px',
    fontWeight: '600',
    left: shouldPlaceLeft ? '-5px' : 'calc(100% + 5px)',
    opacity: '0',
    padding: '8px 11px',
    pointerEvents: 'none',
    position: 'absolute',
    top: '50%',
    transformOrigin: shouldPlaceLeft ? 'right center' : 'left center',
    transition: reduceMotion
      ? 'none'
      : 'opacity 160ms ease, transform 160ms ease',
    whiteSpace: 'nowrap',
  });
  setMarkerLabelVisible(label, isActive);

  button.appendChild(core);
  button.appendChild(label);
  button.addEventListener('mouseenter', () => {
    core.style.transform = 'scale(1.16)';
    setMarkerLabelVisible(label, true);
    onHoverMarker(singleNode.id);
  });
  button.addEventListener('mouseleave', () => {
    core.style.transform = '';
    setMarkerLabelVisible(label, isActive);
    onHoverMarker(null);
  });
  button.addEventListener('focus', () => {
    setMarkerLabelVisible(label, true);
    onHoverMarker(singleNode.id);
  });
  button.addEventListener('blur', () => {
    setMarkerLabelVisible(label, isActive);
    onHoverMarker(null);
  });
  button.addEventListener('click', () => {
    onSelectMarker(singleNode.id, button);
  });

  return button;
}

export function CountryMapStage({
  country,
  level,
  nodes,
  activeMarkerId,
  onHoverMarker,
  onSelectMarker,
  onExitToWorld,
  reduceMotion,
}: CountryMapStageProps) {
  const t = useTranslations('Atlas');
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<MapLibreMarker[]>([]);
  const refreshMarkersRef = useRef<(() => void) | null>(null);
  const nodesRef = useRef(nodes);
  const activeMarkerIdRef = useRef(activeMarkerId);
  const selectMarkerRef = useRef(onSelectMarker);
  const exitToWorldRef = useRef(onExitToWorld);
  const hasRequestedWorldExitRef = useRef(false);
  const hoverMarkerRef = useRef(onHoverMarker);
  const reduceMotionRef = useRef(reduceMotion);
  const clusterLabelRef = useRef((count: number) =>
    t('mapClusterLabel', { count }),
  );
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasTileError, setHasTileError] = useState(false);

  useEffect(() => {
    nodesRef.current = nodes;
    refreshMarkersRef.current?.();
  }, [nodes]);

  useEffect(() => {
    activeMarkerIdRef.current = activeMarkerId;
    refreshMarkersRef.current?.();
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
    clusterLabelRef.current = (count: number) =>
      t('mapClusterLabel', { count });
  }, [t]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    let isCancelled = false;
    let resizeFrame = 0;
    let detachWheelHandler: (() => void) | null = null;

    setIsLoaded(false);
    setHasTileError(false);
    hasRequestedWorldExitRef.current = false;

    void loadMapLibre()
      .then((maplibre) => {
        if (isCancelled || !containerRef.current) {
          return;
        }

        const firstNode = nodesRef.current[0];
        const map = new maplibre.Map({
          container: containerRef.current,
          style: {
            version: 8,
            sources: {
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
            },
            layers: [
              {
                id: 'atlas-ocean',
                type: 'background',
                paint: {
                  'background-color': '#e7ece9',
                },
              },
              {
                id: 'atlas-land',
                type: 'fill',
                source: 'atlasLand',
                paint: {
                  'fill-color': '#bdc8c2',
                  'fill-opacity': 0.98,
                },
              },
              {
                id: 'atlas-coastline',
                type: 'line',
                source: 'atlasLand',
                paint: {
                  'line-color': '#84958e',
                  'line-opacity': 0.72,
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
                  'raster-fade-duration': 260,
                  'raster-saturation': -0.04,
                },
              },
            ],
          },
          center: firstNode ? [firstNode.lng, firstNode.lat] : [0, 24],
          zoom: firstNode ? 5 : 1.5,
          maxZoom: 17,
          minZoom: 1,
          attributionControl: false,
          dragRotate: false,
          pitchWithRotate: false,
          touchPitch: false,
          touchZoomRotate: true,
          scrollZoom: false,
          cooperativeGestures: false,
        });

        mapRef.current = map;
        let isUserZoom = false;

        const requestWorldExit = () => {
          if (hasRequestedWorldExitRef.current) {
            return;
          }

          hasRequestedWorldExitRef.current = true;
          exitToWorldRef.current();
        };

        const handleWheel = (event: WheelEvent) => {
          const delta =
            event.deltaMode === WheelEvent.DOM_DELTA_LINE
              ? event.deltaY * 12
              : event.deltaY;
          if (!Number.isFinite(delta) || delta === 0) {
            return;
          }

          const currentZoom = map.getZoom();
          const zoomStep = Math.min(1.2, Math.max(0.3, Math.abs(delta) / 320));
          const nextZoom = Math.min(
            map.getMaxZoom(),
            Math.max(
              map.getMinZoom(),
              currentZoom + (delta > 0 ? -zoomStep : zoomStep),
            ),
          );
          if (nextZoom === currentZoom) {
            return;
          }

          event.preventDefault();
          event.stopPropagation();

          if (nextZoom <= WORLD_EXIT_ZOOM) {
            requestWorldExit();
            return;
          }

          map.stop();
          map.easeTo({
            zoom: nextZoom,
            duration: reduceMotionRef.current ? 0 : 180,
          });
        };

        container.addEventListener('wheel', handleWheel, { passive: false });
        detachWheelHandler = () =>
          container.removeEventListener('wheel', handleWheel);

        map.on('zoomstart', (event) => {
          isUserZoom = Boolean(event.originalEvent);
        });
        map.on('zoomend', () => {
          if (map.getZoom() > WORLD_EXIT_ZOOM) {
            hasRequestedWorldExitRef.current = false;
            isUserZoom = false;
            return;
          }

          if (isUserZoom) {
            requestWorldExit();
          }
          isUserZoom = false;
        });

        Object.assign(map.getCanvas().style, {
          filter: 'var(--atlas-map-filter)',
          transition: reduceMotionRef.current
            ? 'none'
            : 'filter 700ms cubic-bezier(.22, 1, .36, 1)',
        });

        const clearMarkers = () => {
          for (const marker of markersRef.current) {
            marker.remove();
          }
          markersRef.current = [];
        };

        const refreshMarkers = () => {
          if (!map.isStyleLoaded()) {
            return;
          }

          clearMarkers();
          const groups = groupVisibleNodes(map, nodesRef.current);
          markersRef.current = groups.map((group) => {
            const element = createLocationMarkerElement({
              group,
              map,
              activeMarkerId: activeMarkerIdRef.current,
              onHoverMarker: (id) => hoverMarkerRef.current(id),
              onSelectMarker: (id) => selectMarkerRef.current(id),
              reduceMotion: reduceMotionRef.current,
              clusterLabel: (count) => clusterLabelRef.current(count),
            });

            return new maplibre.Marker({
              element,
              anchor: 'center',
            })
              .setLngLat([group.lng, group.lat])
              .addTo(map);
          });
        };

        refreshMarkersRef.current = refreshMarkers;
        map.on('load', () => {
          if (isCancelled) {
            return;
          }

          fitCountry(map, country, reduceMotionRef.current);
          refreshMarkers();
          setIsLoaded(true);
        });
        map.on('moveend', refreshMarkers);
        map.on('resize', refreshMarkers);

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
      detachWheelHandler?.();
      refreshMarkersRef.current = null;
      for (const marker of markersRef.current) {
        marker.remove();
      }
      markersRef.current = [];
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [country]);

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
                if (nextZoom <= WORLD_EXIT_ZOOM) {
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

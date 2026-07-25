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

import {
  clamp,
  type CountryNode,
  type LocationNode,
} from '@/features/atlas/model/atlas';

interface CountryMapStageProps {
  country: CountryNode;
  level: 'region' | 'place';
  nodes: LocationNode[];
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

const IMAGERY_TILE_URL =
  process.env.NEXT_PUBLIC_ATLAS_IMAGERY_TILE_URL ??
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
const MAPLIBRE_MODULE_URL = '/vendor/maplibre/maplibre-loader.mjs';
const MAPLIBRE_STYLESHEET_URL = '/vendor/maplibre/maplibre-gl.css';
const LOCATION_SOURCE_ID = 'atlas-locations';
const LOCATION_CLUSTER_LAYER_ID = 'atlas-location-clusters';
const LOCATION_POINT_HIT_LAYER_ID = 'atlas-location-point-hit-area';
const LOCATION_POINT_LAYER_ID = 'atlas-location-points';
const LOCATION_ACTIVE_LAYER_ID = 'atlas-location-active';
const COUNTRY_EXIT_ZOOM_DELTA = 0.72;
const COUNTRY_WHEEL_ZOOM_RATE = 1 / 360;
const COUNTRY_PINCH_WHEEL_ZOOM_RATE = 1 / 120;
const COUNTRY_WHEEL_MAX_STEP = 0.32;
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
  options: { animate?: boolean; reduceMotion?: boolean } = {},
) {
  const { clientHeight, clientWidth } = map.getContainer();
  const isCompact = clientWidth < 640;
  const horizontalPadding = isCompact
    ? 18
    : Math.max(24, Math.min(56, clientWidth * 0.07));
  const topPadding = isCompact
    ? Math.min(68, clientHeight * 0.2)
    : Math.max(52, Math.min(72, clientHeight * 0.09));
  const bottomPadding = isCompact
    ? Math.min(28, clientHeight * 0.08)
    : Math.max(52, Math.min(72, clientHeight * 0.09));
  const camera = map.cameraForBounds(country.bounds, {
    padding: {
      top: topPadding,
      right: horizontalPadding,
      bottom: bottomPadding,
      left: horizontalPadding,
    },
  });
  const zoom = camera?.zoom ?? 2;

  const cameraTarget = {
    center: camera?.center ?? [country.lng, country.lat],
    zoom,
  } as const;

  if (options.animate && !options.reduceMotion) {
    map.easeTo({
      ...cameraTarget,
      duration: 520,
    });
  } else {
    map.jumpTo(cameraTarget);
  }

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

function createLocationLabelElement({
  node,
  placeOnLeft,
  onPointerEnter,
  onPointerLeave,
  onSelect,
}: {
  node: LocationNode;
  placeOnLeft: boolean;
  onPointerEnter: () => void;
  onPointerLeave: () => void;
  onSelect: (element: HTMLButtonElement) => void;
}) {
  const element = document.createElement('button');
  const label = document.createElement('span');

  element.type = 'button';
  element.dataset.atlasMapLabel = node.id;
  element.className = placeOnLeft
    ? 'group flex min-h-11 touch-manipulation items-center border-0 bg-transparent p-0 pr-2 text-left outline-none'
    : 'group flex min-h-11 touch-manipulation items-center border-0 bg-transparent p-0 pl-2 text-left outline-none';
  element.setAttribute('aria-label', node.label);
  element.addEventListener('pointerenter', onPointerEnter);
  element.addEventListener('pointerleave', onPointerLeave);
  element.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    onSelect(element);
  });

  label.textContent = node.label;
  label.className =
    'block whitespace-nowrap rounded-[10px] border border-[var(--atlas-rule)] bg-[var(--atlas-card)]/92 px-[11px] py-2 text-[13px] font-semibold text-[var(--atlas-ink)] shadow-[0_10px_28px_var(--atlas-shadow)] backdrop-blur-[14px] transition-[background-color,box-shadow] group-hover:bg-[var(--atlas-card)] group-focus-visible:ring-2 group-focus-visible:ring-[var(--atlas-accent)] group-focus-visible:ring-offset-2 group-focus-visible:ring-offset-transparent';
  Object.assign(label.style, {
    backdropFilter: 'blur(14px)',
  });
  element.appendChild(label);

  return element;
}

export function CountryMapStage({
  country,
  level,
  nodes,
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
  const levelRef = useRef(level);
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
    levelRef.current = level;
  }, [level]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    let isCancelled = false;
    let resizeFrame = 0;
    let hoverClearTimer = 0;
    let wheelFrame = 0;
    let pendingWheelZoom = 0;
    let wheelPoint: [number, number] | null = null;
    let detachInputHandlers: (() => void) | null = null;

    setIsLoaded(false);
    setHasTileError(false);
    hasRequestedWorldExitRef.current = false;

    void loadMapLibre()
      .then((maplibre) => {
        if (isCancelled || !containerRef.current) {
          return;
        }

        const map = new maplibre.Map({
          container: containerRef.current,
          style: {
            version: 8,
            sources: {
              imagery: {
                type: 'raster',
                tiles: [IMAGERY_TILE_URL],
                tileSize: 256,
                maxzoom: 23,
                attribution:
                  'Source: Esri, Vantor, Earthstar Geographics, and the GIS User Community',
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
                id: 'imagery',
                type: 'raster',
                source: 'imagery',
                paint: {
                  'raster-brightness-max': detailRaster.brightnessMax,
                  'raster-brightness-min': detailRaster.brightnessMin,
                  'raster-contrast': detailRaster.contrast,
                  'raster-fade-duration': 0,
                  'raster-hue-rotate': detailRaster.hueRotate,
                  'raster-opacity': 1,
                  'raster-resampling': 'linear',
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
          center: [country.lng, country.lat],
          zoom: 2,
          maxZoom: 17,
          minZoom: 0.5,
          attributionControl: false,
          dragPan: {
            maxSpeed: 0,
          },
          dragRotate: false,
          pitchWithRotate: false,
          touchPitch: false,
          touchZoomRotate: true,
          scrollZoom: false,
          cooperativeGestures: false,
        });

        mapRef.current = map;
        map.touchZoomRotate.disableRotation();
        let isUserZoom = false;
        let hasUserMovedMap = false;

        const requestWorldExit = () => {
          if (hasRequestedWorldExitRef.current) {
            return;
          }

          hasRequestedWorldExitRef.current = true;
          exitToWorldRef.current();
        };

        const applyWheelZoom = () => {
          wheelFrame = 0;

          if (isCancelled || pendingWheelZoom === 0) {
            pendingWheelZoom = 0;
            return;
          }

          const zoomDelta = clamp(
            pendingWheelZoom,
            -COUNTRY_WHEEL_MAX_STEP,
            COUNTRY_WHEEL_MAX_STEP,
          );
          pendingWheelZoom = 0;

          const nextZoom = clamp(
            map.getZoom() + zoomDelta,
            map.getMinZoom(),
            map.getMaxZoom(),
          );

          if (
            levelRef.current === 'region' &&
            nextZoom <= worldExitZoomRef.current
          ) {
            requestWorldExit();
            return;
          }

          if (nextZoom === map.getZoom()) {
            return;
          }

          hasUserMovedMap = true;
          map.stop();
          map.easeTo({
            zoom: nextZoom,
            around: wheelPoint ? map.unproject(wheelPoint) : undefined,
            duration: 0,
          });
        };

        const handleWheel = (event: WheelEvent) => {
          const delta =
            event.deltaMode === WheelEvent.DOM_DELTA_LINE
              ? event.deltaY * 16
              : event.deltaY;

          if (!Number.isFinite(delta) || delta === 0) {
            return;
          }

          event.preventDefault();
          event.stopPropagation();

          const bounds = container.getBoundingClientRect();
          wheelPoint = [
            event.clientX - bounds.left,
            event.clientY - bounds.top,
          ];
          pendingWheelZoom +=
            -delta *
            (event.ctrlKey
              ? COUNTRY_PINCH_WHEEL_ZOOM_RATE
              : COUNTRY_WHEEL_ZOOM_RATE);

          if (!wheelFrame) {
            wheelFrame = window.requestAnimationFrame(applyWheelZoom);
          }
        };

        container.addEventListener('wheel', handleWheel, {
          passive: false,
        });
        detachInputHandlers = () => {
          container.removeEventListener('wheel', handleWheel);
        };

        map.on('zoomstart', (event) => {
          isUserZoom = Boolean(event.originalEvent);
          hasUserMovedMap ||= isUserZoom;
        });
        map.on('dragstart', (event) => {
          hasUserMovedMap ||= Boolean(event.originalEvent);
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
            element: createLocationLabelElement({
              node,
              placeOnLeft,
              onPointerEnter: () => {
                window.clearTimeout(hoverClearTimer);
                setHoveredLocation(node.id);
              },
              onPointerLeave: () => {
                window.clearTimeout(hoverClearTimer);
                hoverClearTimer = window.setTimeout(
                  () => setHoveredLocation(null),
                  80,
                );
              },
              onSelect: (element) => {
                selectMarkerRef.current(node.id, element);
              },
            }),
            anchor: placeOnLeft ? 'right' : 'left',
          })
            .setLngLat([node.lng, node.lat])
            .addTo(map);
        };

        syncLocationLabelRef.current = syncLocationLabel;

        const setHoveredLocation = (id: string | null) => {
          window.clearTimeout(hoverClearTimer);
          hoverClearTimer = 0;

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
          window.clearTimeout(hoverClearTimer);
          hoverClearTimer = window.setTimeout(
            () => setHoveredLocation(null),
            80,
          );
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

          resizeFrame = window.requestAnimationFrame(() => {
            if (isCancelled) {
              return;
            }

            map.resize();
            const entryZoom = fitCountry(map, country);
            worldExitZoomRef.current = Math.max(
              map.getMinZoom() + 0.05,
              entryZoom - COUNTRY_EXIT_ZOOM_DELTA,
            );
            syncLocationLabel();
            setIsLoaded(true);
          });
        });

        const resizeObserver = new ResizeObserver(() => {
          window.cancelAnimationFrame(resizeFrame);
          resizeFrame = window.requestAnimationFrame(() => {
            map.resize();
            if (!hasUserMovedMap && levelRef.current === 'region') {
              const entryZoom = fitCountry(map, country);
              worldExitZoomRef.current = Math.max(
                map.getMinZoom() + 0.05,
                entryZoom - COUNTRY_EXIT_ZOOM_DELTA,
              );
            }
          });
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
      window.cancelAnimationFrame(wheelFrame);
      window.clearTimeout(hoverClearTimer);
      detachInputHandlers?.();
      syncLocationLabelRef.current = null;
      labelMarkerRef.current?.remove();
      labelMarkerRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [accentColor, country, detailRaster]);

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

  useEffect(() => {
    const map = mapRef.current;
    if (!map || level !== 'region') {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      map.resize();
      const entryZoom = fitCountry(map, country, {
        animate: true,
        reduceMotion,
      });
      worldExitZoomRef.current = Math.max(
        map.getMinZoom() + 0.05,
        entryZoom - COUNTRY_EXIT_ZOOM_DELTA,
      );
      hasRequestedWorldExitRef.current = false;
    });

    return () => window.cancelAnimationFrame(frame);
  }, [country, level, reduceMotion]);

  return (
    <div
      data-slot="atlas-country-map-stage"
      data-level={level}
      className="relative h-full w-full overflow-hidden bg-[var(--atlas-panel-strong)]"
      role="group"
      aria-label={t('interactiveCountryMap', { country: country.label })}
    >
      <div
        ref={containerRef}
        className={cn(
          'absolute inset-0 origin-center transition duration-700 ease-out motion-reduce:transition-none',
          isLoaded ? 'scale-100 opacity-100' : 'scale-[1.035] opacity-0',
        )}
        style={{ position: 'absolute', inset: 0 }}
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-10 opacity-15 sm:opacity-25"
        style={{
          background:
            'radial-gradient(circle at 50% 44%, transparent 0%, transparent 62%, color-mix(in srgb, var(--atlas-bg) 34%, transparent) 100%)',
          boxShadow: 'inset 0 0 36px var(--atlas-shadow)',
        }}
      />

      <div
        className={cn(
          'pointer-events-none absolute inset-0 z-20 grid place-items-center bg-[var(--atlas-panel-strong)] transition duration-500 motion-reduce:transition-none',
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

      <div className="pointer-events-none absolute inset-x-2 bottom-2 z-30 flex items-end justify-between gap-2 sm:inset-x-4 sm:bottom-4">
        <div className="bg-[var(--atlas-panel)]/72 pointer-events-auto max-w-[68%] rounded-md px-1.5 py-0.5 text-[7px] font-medium leading-tight text-[var(--atlas-muted)] shadow-sm shadow-[var(--atlas-shadow)] backdrop-blur-md sm:max-w-[65%] sm:px-2.5 sm:py-1 sm:text-[9px]">
          <a
            href="https://www.esri.com/"
            target="_blank"
            rel="noreferrer"
            className="rounded-sm outline-none transition-colors hover:text-[var(--atlas-ink)] focus-visible:ring-2 focus-visible:ring-[var(--atlas-accent)]"
          >
            Imagery © Esri, Vantor, Earthstar Geographics, GIS User Community
          </a>
        </div>

        <div className="pointer-events-auto flex shrink-0 flex-col items-end">
          <div className="sm:bg-[var(--atlas-card)]/88 flex gap-1 sm:gap-0 sm:overflow-hidden sm:rounded-xl sm:border sm:border-[var(--atlas-rule)] sm:shadow-lg sm:shadow-[var(--atlas-shadow)] sm:backdrop-blur-md">
            <button
              type="button"
              className={cn(
                COUNTRY_MAP_CONTROL_CLASSNAME,
                'rounded-full border border-[var(--atlas-rule)] bg-[var(--atlas-card)] shadow-lg backdrop-blur-md sm:rounded-none sm:border-y-0 sm:border-l-0 sm:bg-transparent sm:shadow-none',
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
              className={cn(
                COUNTRY_MAP_CONTROL_CLASSNAME,
                'rounded-full border border-[var(--atlas-rule)] bg-[var(--atlas-card)] shadow-lg backdrop-blur-md sm:rounded-none sm:border-0 sm:bg-transparent sm:shadow-none',
              )}
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

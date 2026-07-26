'use client';

import { useEffect, useRef, useState } from 'react';

import { LocateFixed, Minus, Plus } from 'lucide-react';
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
  focusMarkerKey: number;
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
        count: node.posts.length,
        id: node.id,
        label: node.label,
      },
    })),
  };
}

function createLocationLabelElement({
  node,
  postCountLabel,
  onPointerEnter,
  onPointerLeave,
  onSelect,
}: {
  node: LocationNode;
  postCountLabel: string;
  onPointerEnter: () => void;
  onPointerLeave: () => void;
  onSelect: (element: HTMLButtonElement) => void;
}) {
  const root = document.createElement('div');
  const element = document.createElement('button');
  const connector = document.createElementNS(
    'http://www.w3.org/2000/svg',
    'svg',
  );
  const connectorPath = document.createElementNS(
    'http://www.w3.org/2000/svg',
    'path',
  );
  const label = document.createElement('span');
  const labelTitle = document.createElement('span');
  const postCount = node.posts.length;

  root.dataset.slot = 'atlas-map-label-anchor';
  root.dataset.occluded = 'false';
  root.dataset.state = 'idle';
  root.className = 'pointer-events-none relative h-px w-px overflow-visible';

  element.type = 'button';
  element.dataset.slot = 'atlas-map-label';
  element.dataset.kind = postCount > 1 ? 'collection' : 'single';
  element.dataset.occluded = 'false';
  element.dataset.state = 'idle';
  element.dataset.atlasMapLabel = node.id;
  element.className =
    'group pointer-events-auto absolute top-0 z-10 flex min-h-11 touch-manipulation items-center border-0 bg-transparent p-0 text-left outline-none transition-opacity duration-150 data-[occluded=true]:invisible data-[occluded=true]:pointer-events-none data-[state=idle]:opacity-90 data-[state=hover]:opacity-100 data-[state=active]:opacity-100';
  element.setAttribute(
    'aria-label',
    postCount > 1 ? `${node.label}, ${postCountLabel}` : node.label,
  );
  element.addEventListener('pointerenter', onPointerEnter);
  element.addEventListener('pointerleave', onPointerLeave);
  element.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    onSelect(element);
  });

  label.dataset.slot = 'atlas-map-label-card';
  label.className =
    'flex items-center gap-2 whitespace-nowrap rounded-[9px] border bg-[var(--atlas-card)] px-2.5 py-2 text-[12px] font-bold leading-none tracking-[0.01em] text-[var(--atlas-ink)] transition-[background-color,border-color,box-shadow,transform] group-data-[state=active]:bg-[var(--atlas-card-active)] group-hover:border-[var(--atlas-accent)] group-hover:bg-[var(--atlas-card-active)] group-active:translate-y-px group-focus-visible:ring-2 group-focus-visible:ring-[var(--atlas-accent)] group-focus-visible:ring-offset-2 group-focus-visible:ring-offset-[var(--atlas-bg)] sm:px-3 sm:text-[13px]';

  labelTitle.dataset.slot = 'atlas-map-label-title';
  labelTitle.textContent = node.label;
  label.appendChild(labelTitle);

  if (postCount > 1) {
    const countBadge = document.createElement('span');
    countBadge.dataset.slot = 'atlas-map-label-count';
    countBadge.setAttribute('aria-hidden', 'true');
    countBadge.className =
      'inline-grid h-5 min-w-5 place-items-center rounded-full bg-[var(--atlas-accent)] px-1 text-[10px] font-extrabold leading-none text-[var(--atlas-on-accent)] shadow-[0_2px_8px_var(--atlas-shadow)]';
    countBadge.textContent = String(postCount);
    label.appendChild(countBadge);
  }

  connector.dataset.slot = 'atlas-map-label-connector';
  connector.dataset.displaced = 'false';
  connector.setAttribute('aria-hidden', 'true');
  connector.setAttribute('height', '1');
  connector.setAttribute('width', '1');
  connector.classList.add(
    'pointer-events-none',
    'absolute',
    'left-0',
    'top-0',
    'overflow-visible',
    'transition-opacity',
    'duration-150',
  );
  Object.assign(connector.style, {
    color: 'color-mix(in srgb, var(--atlas-ink) 52%, transparent)',
    opacity: '0',
  });

  connectorPath.setAttribute('fill', 'none');
  connectorPath.setAttribute('stroke', 'currentColor');
  connectorPath.setAttribute('stroke-linecap', 'round');
  connectorPath.setAttribute('stroke-width', '1.15');
  connectorPath.setAttribute('vector-effect', 'non-scaling-stroke');
  connector.appendChild(connectorPath);

  root.appendChild(connector);
  element.appendChild(label);
  root.appendChild(element);

  const updateConnectorAppearance = () => {
    const state = element.dataset.state;
    const isVisible =
      connector.dataset.displaced === 'true' &&
      element.dataset.occluded !== 'true';

    connector.style.color =
      state === 'active' || state === 'hover'
        ? 'var(--atlas-accent)'
        : 'color-mix(in srgb, var(--atlas-ink) 52%, transparent)';
    connector.style.opacity = isVisible
      ? state === 'active'
        ? '0.92'
        : state === 'hover'
          ? '0.72'
          : '0.38'
      : '0';
    connectorPath.setAttribute(
      'stroke-width',
      state === 'active' ? '1.5' : '1.15',
    );
  };

  const setPlacement = (side: 'left' | 'right', verticalOffset: number) => {
    const horizontalOffset = side === 'right' ? 10 : -10;
    const isDisplaced = Math.abs(verticalOffset) >= 4;

    element.style.left = side === 'right' ? '10px' : '';
    element.style.right = side === 'left' ? '10px' : '';
    element.style.transform = `translateY(calc(-50% + ${verticalOffset}px))`;
    connector.dataset.displaced = String(isDisplaced);
    connectorPath.setAttribute(
      'd',
      isDisplaced
        ? `M 0 0 C ${horizontalOffset * 0.42} 0, ${horizontalOffset * 0.58} ${verticalOffset}, ${horizontalOffset} ${verticalOffset}`
        : '',
    );
    Object.assign(label.style, {
      borderColor:
        element.dataset.state === 'active'
          ? 'var(--atlas-accent)'
          : 'color-mix(in srgb, var(--atlas-ink) 38%, var(--atlas-card))',
      boxShadow:
        element.dataset.state === 'active'
          ? '0 0 0 1px var(--atlas-accent), 0 6px 18px color-mix(in srgb, var(--atlas-ink) 28%, transparent)'
          : '0 4px 14px color-mix(in srgb, var(--atlas-ink) 24%, transparent)',
    });
    updateConnectorAppearance();
  };

  const setOccluded = (occluded: boolean) => {
    root.dataset.occluded = String(occluded);
    element.dataset.occluded = String(occluded);
    if (occluded) {
      element.setAttribute('aria-hidden', 'true');
      element.tabIndex = -1;
    } else {
      element.removeAttribute('aria-hidden');
      element.removeAttribute('tabindex');
    }
    updateConnectorAppearance();
  };

  const setState = (state: 'active' | 'hover' | 'idle') => {
    root.dataset.state = state;
    element.dataset.state = state;
    updateConnectorAppearance();
  };

  return {
    button: element,
    label,
    root,
    setOccluded,
    setPlacement,
    setState,
  };
}

export function CountryMapStage({
  country,
  level,
  nodes,
  detailRaster,
  accentColor,
  activeMarkerId,
  focusMarkerKey,
  onHoverMarker,
  onSelectMarker,
  onExitToWorld,
  reduceMotion,
}: CountryMapStageProps) {
  const t = useTranslations('Atlas');
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const syncLocationLabelRef = useRef<(() => void) | null>(null);
  const nodesRef = useRef(nodes);
  const activeMarkerIdRef = useRef(activeMarkerId);
  const hoveredMarkerIdRef = useRef<string | null>(null);
  const selectMarkerRef = useRef(onSelectMarker);
  const formatPostCountRef = useRef((count: number) =>
    t('locationPostCount', { count }),
  );
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
    formatPostCountRef.current = (count: number) =>
      t('locationPostCount', { count });
  }, [t]);

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
                cluster: false,
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
                  'circle-radius': [
                    'interpolate',
                    ['linear'],
                    ['get', 'count'],
                    1,
                    13,
                    2,
                    16,
                    6,
                    20,
                  ],
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
                  'circle-radius': [
                    'interpolate',
                    ['linear'],
                    ['get', 'count'],
                    1,
                    5.5,
                    2,
                    7,
                    6,
                    9,
                  ],
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
                  'circle-radius': [
                    'interpolate',
                    ['linear'],
                    ['get', 'count'],
                    1,
                    8,
                    2,
                    9.5,
                    6,
                    12,
                  ],
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

          if (nextZoom <= worldExitZoomRef.current) {
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

        const locationLabels = new Map<
          string,
          {
            marker: MapLibreMarker;
            node: LocationNode;
            handle: ReturnType<typeof createLocationLabelElement>;
          }
        >();

        const clearLocationLabels = () => {
          for (const { marker } of locationLabels.values()) {
            marker.remove();
          }
          locationLabels.clear();
        };

        const setLocationLabelOccluded = (
          handle: ReturnType<typeof createLocationLabelElement>,
          occluded: boolean,
        ) => {
          handle.setOccluded(occluded);
        };

        const positionLocationLabels = () => {
          const { clientHeight, clientWidth } = map.getContainer();
          const compact = clientWidth < 640;
          const topBoundary = compact ? 58 : 68;
          const bottomBoundary = clientHeight - (compact ? 60 : 22);
          const verticalStep = compact ? 20 : 22;
          const verticalOffsets = [
            0,
            -verticalStep,
            verticalStep,
            -verticalStep * 2,
            verticalStep * 2,
          ];
          const placedBoxes: Array<{
            left: number;
            right: number;
            top: number;
            bottom: number;
          }> = [];
          const activeId = activeMarkerIdRef.current;
          const hoveredId = hoveredMarkerIdRef.current;
          const orderedLabels = [...locationLabels.values()].sort((a, b) => {
            const priority = (node: LocationNode) =>
              node.id === activeId
                ? 3
                : node.id === hoveredId
                  ? 2
                  : node.posts.length > 1
                    ? 1
                    : 0;
            return priority(b.node) - priority(a.node);
          });

          for (const { handle, node } of orderedLabels) {
            const point = map.project([node.lng, node.lat]);
            const labelWidth = Math.max(handle.button.offsetWidth, 64);
            const labelHeight = Math.max(handle.button.offsetHeight, 36);
            const preferredSide =
              point.x > clientWidth * 0.58 ? 'left' : 'right';
            const sides = [
              preferredSide,
              preferredSide === 'left' ? 'right' : 'left',
            ] as const;
            let bestPlacement:
              | {
                  side: 'left' | 'right';
                  verticalOffset: number;
                  box: (typeof placedBoxes)[number];
                  outside: number;
                  overlaps: number;
                  score: number;
                }
              | undefined;

            for (const side of sides) {
              for (const verticalOffset of verticalOffsets) {
                const left =
                  side === 'right' ? point.x + 10 : point.x - 10 - labelWidth;
                const top = point.y + verticalOffset - labelHeight / 2;
                const box = {
                  left,
                  right: left + labelWidth,
                  top,
                  bottom: top + labelHeight,
                };
                const outside =
                  Math.max(0, 8 - box.left) +
                  Math.max(0, box.right - (clientWidth - 8)) +
                  Math.max(0, topBoundary - box.top) +
                  Math.max(0, box.bottom - bottomBoundary);
                const overlaps = placedBoxes.filter(
                  (placed) =>
                    box.left < placed.right + 6 &&
                    box.right > placed.left - 6 &&
                    box.top < placed.bottom + 6 &&
                    box.bottom > placed.top - 6,
                ).length;
                const score =
                  overlaps * 10000 +
                  outside * 100 +
                  Math.abs(verticalOffset) +
                  (side === preferredSide ? 0 : 16);

                if (!bestPlacement || score < bestPlacement.score) {
                  bestPlacement = {
                    side,
                    verticalOffset,
                    box,
                    outside,
                    overlaps,
                    score,
                  };
                }
              }
            }

            if (!bestPlacement) {
              setLocationLabelOccluded(handle, true);
              continue;
            }

            const isPriorityLabel =
              node.id === activeId || node.id === hoveredId;
            const shouldHide =
              (bestPlacement.overlaps > 0 || bestPlacement.outside > 0) &&
              !isPriorityLabel;
            setLocationLabelOccluded(handle, shouldHide);
            if (shouldHide) {
              continue;
            }

            handle.setPlacement(
              bestPlacement.side,
              bestPlacement.verticalOffset,
            );
            handle.root.style.zIndex = isPriorityLabel ? '20' : '10';
            placedBoxes.push(bestPlacement.box);
          }
        };

        const updateLocationLabelStates = () => {
          for (const { handle, node } of locationLabels.values()) {
            const state =
              node.id === activeMarkerIdRef.current
                ? 'active'
                : node.id === hoveredMarkerIdRef.current
                  ? 'hover'
                  : 'idle';
            handle.setState(state);
            if (state === 'active') {
              handle.button.setAttribute('aria-current', 'location');
            } else {
              handle.button.removeAttribute('aria-current');
            }
          }
        };

        const rebuildLocationLabels = () => {
          clearLocationLabels();

          for (const node of nodesRef.current) {
            const handle = createLocationLabelElement({
              node,
              postCountLabel: formatPostCountRef.current(node.posts.length),
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
                map.stop();
                selectMarkerRef.current(node.id, element);
              },
            });
            const marker = new maplibre.Marker({
              element: handle.root,
              anchor: 'center',
            })
              .setLngLat([node.lng, node.lat])
              .addTo(map);
            handle.root.removeAttribute('aria-label');
            handle.root.removeAttribute('role');
            handle.root.removeAttribute('tabindex');

            locationLabels.set(node.id, { handle, marker, node });
          }
        };

        const syncLocationLabels = () => {
          const nextNodeIds = new Set(nodesRef.current.map((node) => node.id));
          const needsRebuild =
            nextNodeIds.size !== locationLabels.size ||
            [...nextNodeIds].some((id) => !locationLabels.has(id));

          if (needsRebuild) {
            rebuildLocationLabels();
          }
          updateLocationLabelStates();
          positionLocationLabels();
        };

        syncLocationLabelRef.current = syncLocationLabels;

        const setHoveredLocation = (id: string | null) => {
          window.clearTimeout(hoverClearTimer);
          hoverClearTimer = 0;

          if (hoveredMarkerIdRef.current === id) {
            return;
          }

          hoveredMarkerIdRef.current = id;
          hoverMarkerRef.current(id);
          syncLocationLabels();
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
            syncLocationLabels();
            setIsLoaded(true);
          });
        });
        map.on('moveend', positionLocationLabels);

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
      duration: reduceMotion ? 0 : 240,
    });
  }, [activeMarkerId, level, nodes, reduceMotion]);

  useEffect(() => {
    const map = mapRef.current;
    const activeNode = nodes.find((node) => node.id === activeMarkerId);
    if (!focusMarkerKey || !map || !activeNode) {
      return;
    }

    map.stop();
    map.easeTo({
      center: [activeNode.lng, activeNode.lat],
      zoom: Math.max(
        map.getZoom(),
        map.getContainer().clientWidth < 640 ? 9 : 10,
      ),
      duration: reduceMotion ? 0 : 240,
    });
  }, [activeMarkerId, focusMarkerKey, nodes, reduceMotion]);

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
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              className={cn(
                'flex h-11 touch-manipulation items-center gap-2 rounded-full border border-[var(--atlas-rule)] bg-[var(--atlas-card)] px-3 text-[12px] font-bold text-[var(--atlas-ink)] shadow-lg shadow-[var(--atlas-shadow)] outline-none transition-colors hover:border-[var(--atlas-accent)] hover:bg-[var(--atlas-card-active)] focus-visible:ring-2 focus-visible:ring-[var(--atlas-accent)] disabled:cursor-not-allowed disabled:opacity-45 sm:px-3.5 sm:text-[13px]',
              )}
              onClick={() => {
                const map = mapRef.current;
                const activeNode = nodesRef.current.find(
                  (node) => node.id === activeMarkerIdRef.current,
                );
                if (!map || !activeNode) {
                  return;
                }

                const targetZoom =
                  map.getContainer().clientWidth < 640 ? 9 : 10;
                map.stop();
                map.easeTo({
                  center: [activeNode.lng, activeNode.lat],
                  zoom: Math.max(map.getZoom(), targetZoom),
                  duration: reduceMotion ? 0 : 240,
                });
              }}
              disabled={!activeMarkerId}
              aria-label={t('focusPostLocation')}
              title={t('focusPostLocation')}
            >
              <LocateFixed className="h-4 w-4" aria-hidden="true" />
              <span>{t('focusPostLocationShort')}</span>
            </button>
            <div className="flex overflow-hidden rounded-full border border-[var(--atlas-rule)] bg-[var(--atlas-card)] shadow-lg shadow-[var(--atlas-shadow)] sm:rounded-xl">
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

                  const nextZoom = Math.max(
                    map.getZoom() - 1,
                    map.getMinZoom(),
                  );
                  if (nextZoom <= worldExitZoomRef.current) {
                    if (!hasRequestedWorldExitRef.current) {
                      hasRequestedWorldExitRef.current = true;
                      exitToWorldRef.current();
                    }
                    return;
                  }

                  map.stop();
                  map.easeTo({
                    zoom: nextZoom,
                    duration: reduceMotion ? 0 : 240,
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
                  map.stop();
                  map.easeTo({
                    center: activeNode
                      ? [activeNode.lng, activeNode.lat]
                      : map.getCenter(),
                    zoom: Math.min(map.getZoom() + 1, map.getMaxZoom()),
                    duration: reduceMotion ? 0 : 240,
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

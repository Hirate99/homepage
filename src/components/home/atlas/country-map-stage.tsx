'use client';

import 'maplibre-gl/dist/maplibre-gl.css';

import { useEffect, useRef, useState } from 'react';

import { ExternalLink, MapPinned } from 'lucide-react';
import type { Map as MapLibreMap, Marker as MapLibreMarker } from 'maplibre-gl';
import { useTranslations } from 'next-intl';

import { cn } from '@/lib/utils';

import type { CountryNode, LocationNode } from './model';

interface CountryMapStageProps {
  country: CountryNode;
  level: 'region' | 'place';
  nodes: LocationNode[];
  activeMarkerId: string | null;
  onHoverMarker: (id: string | null) => void;
  onSelectMarker: (id: string) => void;
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

const TILE_URL =
  process.env.NEXT_PUBLIC_ATLAS_TILE_URL ??
  'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const CLUSTER_CELL_SIZE = 54;

function fitCountry(
  map: MapLibreMap,
  nodes: LocationNode[],
  reduceMotion: boolean,
) {
  if (nodes.length === 0) {
    return;
  }

  if (nodes.length === 1) {
    map.easeTo({
      center: [nodes[0].lng, nodes[0].lat],
      zoom: 7,
      duration: reduceMotion ? 0 : 900,
    });
    return;
  }

  const longitudes = nodes.map((node) => node.lng);
  const latitudes = nodes.map((node) => node.lat);
  map.fitBounds(
    [
      [Math.min(...longitudes), Math.min(...latitudes)],
      [Math.max(...longitudes), Math.max(...latitudes)],
    ],
    {
      padding: { top: 112, right: 72, bottom: 72, left: 72 },
      maxZoom: 7.25,
      duration: reduceMotion ? 0 : 1050,
    },
  );
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
      const nextCount = group.nodes.length + 1;
      group.lat = (group.lat * group.nodes.length + node.lat) / nextCount;
      group.lng = (group.lng * group.nodes.length + node.lng) / nextCount;
      group.screenX =
        (group.screenX * group.nodes.length + point.x) / nextCount;
      group.screenY =
        (group.screenY * group.nodes.length + point.y) / nextCount;
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

  return [...groups.values()];
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
  onSelectMarker: (id: string) => void;
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
    cursor: 'pointer',
    display: 'grid',
    height: '44px',
    placeItems: 'center',
    position: 'relative',
    width: '44px',
  });

  Object.assign(core.style, {
    alignItems: 'center',
    background: '#d9603b',
    border: '2px solid #fff7df',
    borderRadius: '999px',
    boxShadow: isActive
      ? '0 0 0 7px rgba(217, 96, 59, .3), 0 8px 24px rgba(23, 63, 61, .24)'
      : '0 0 0 4px rgba(217, 96, 59, .18), 0 6px 18px rgba(23, 63, 61, .18)',
    color: '#fff7df',
    display: 'flex',
    fontSize: '12px',
    fontWeight: '700',
    height: isCluster ? '34px' : isActive ? '18px' : '14px',
    justifyContent: 'center',
    minWidth: isCluster ? '34px' : isActive ? '18px' : '14px',
    transition: reduceMotion ? 'none' : 'transform 180ms ease',
  });

  if (isCluster) {
    core.textContent = String(group.nodes.length);
    button.appendChild(core);
    button.addEventListener('click', () => {
      map.easeTo({
        center: [group.lng, group.lat],
        zoom: Math.min(map.getZoom() + 2, 14),
        duration: reduceMotion ? 0 : 620,
      });
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
    background: 'rgba(255, 249, 232, .96)',
    border: '1px solid rgba(23, 63, 61, .2)',
    borderRadius: '9px',
    boxShadow: '0 8px 22px rgba(23, 63, 61, .18)',
    color: '#173f3d',
    fontSize: '12px',
    fontWeight: '700',
    left: shouldPlaceLeft ? '-5px' : 'calc(100% + 5px)',
    opacity: '0',
    padding: '7px 9px',
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
  button.addEventListener('click', () => onSelectMarker(singleNode.id));

  return button;
}

export function CountryMapStage({
  country,
  level,
  nodes,
  activeMarkerId,
  onHoverMarker,
  onSelectMarker,
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

    void import('maplibre-gl').then((maplibre: MapLibreModule) => {
      if (isCancelled || !containerRef.current) {
        return;
      }

      const firstNode = nodesRef.current[0];
      const map = new maplibre.Map({
        container: containerRef.current,
        style: {
          version: 8,
          sources: {
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
              id: 'osm',
              type: 'raster',
              source: 'osm',
              paint: {
                'raster-fade-duration': 180,
                'raster-saturation': -0.08,
              },
            },
          ],
        },
        center: firstNode ? [firstNode.lng, firstNode.lat] : [0, 24],
        zoom: firstNode ? 5 : 1.5,
        maxZoom: 17,
        minZoom: 1,
        attributionControl: {
          compact: true,
        },
        dragRotate: false,
        pitchWithRotate: false,
        touchPitch: false,
        scrollZoom: true,
        cooperativeGestures:
          navigator.maxTouchPoints > 0 ||
          window.matchMedia('(pointer: coarse)').matches,
      });

      mapRef.current = map;
      map.addControl(
        new maplibre.NavigationControl({
          showCompass: false,
          visualizePitch: false,
        }),
        'bottom-right',
      );

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

        fitCountry(map, nodesRef.current, reduceMotionRef.current);
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
    });

    return () => {
      isCancelled = true;
      window.cancelAnimationFrame(resizeFrame);
      refreshMarkersRef.current = null;
      for (const marker of markersRef.current) {
        marker.remove();
      }
      markersRef.current = [];
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [country.id]);

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
      className="relative h-full min-h-[430px] w-full overflow-hidden bg-[#d8d5c8]"
      role="group"
      aria-label={t('interactiveCountryMap', { country: country.label })}
    >
      <div
        ref={containerRef}
        className="absolute inset-0"
        style={{ position: 'absolute', inset: 0 }}
      />

      <div
        className={cn(
          'pointer-events-none absolute inset-0 z-10 grid place-items-center bg-[var(--atlas-panel-strong)] transition-opacity duration-500',
          isLoaded ? 'opacity-0' : 'opacity-100',
        )}
        role="status"
        aria-label={t('loadingCountryMap', { country: country.label })}
      >
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[var(--atlas-rule)] border-t-[var(--atlas-accent)] motion-reduce:animate-none" />
      </div>

      <div className="pointer-events-none absolute bottom-4 left-4 z-20 hidden items-center gap-2.5 rounded-full border border-white/60 bg-[#fff9e8]/90 px-3.5 py-2 text-[#173f3d] shadow-lg backdrop-blur-md sm:flex">
        <MapPinned className="h-4 w-4" aria-hidden="true" />
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em]">
          {country.label}
        </span>
      </div>

      <a
        href="https://www.openstreetmap.org/fixthemap"
        target="_blank"
        rel="noreferrer"
        className="absolute bottom-1.5 left-2 z-30 hidden min-h-8 items-center gap-1 rounded bg-white/85 px-2 text-[10px] font-semibold text-[#173f3d] shadow-sm outline-none hover:bg-white focus-visible:ring-2 focus-visible:ring-[#d9603b] sm:inline-flex"
      >
        {t('reportMapIssue')}
        <ExternalLink className="h-3 w-3" aria-hidden="true" />
      </a>

      {hasTileError && (
        <p
          className="bg-[var(--atlas-card)]/95 absolute bottom-14 left-1/2 z-30 w-[min(90%,420px)] -translate-x-1/2 rounded-xl border border-[var(--atlas-rule)] px-4 py-3 text-center text-xs font-medium text-[var(--atlas-ink)] shadow-lg backdrop-blur-md"
          role="status"
        >
          {t('mapTilesUnavailable')}
        </p>
      )}
    </div>
  );
}

'use client';

import Image from 'next/image';
import {
  type CSSProperties,
  type ComponentType,
  type MutableRefObject,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { AnimatePresence, motion } from 'framer-motion';
import type { GlobeMethods, GlobeProps } from 'react-globe.gl';

import { type CityPost } from '@/lib/collections';
import { clipCDNImage, cn } from '@/lib/utils';

import { ExpandedPost, type CardRect } from './images';

type ZoomTier = 'world' | 'region' | 'place';

interface GlobeAtlasProps {
  posts: CityPost[];
}

interface LocationNode {
  kind: 'location';
  id: string;
  label: string;
  country: string;
  region: string;
  lat: number;
  lng: number;
  count: number;
  posts: CityPost[];
  cover: string;
}

interface CountryNode {
  kind: 'country';
  id: string;
  label: string;
  lat: number;
  lng: number;
  count: number;
  postCount: number;
  locations: LocationNode[];
  cover: string;
}

interface PostNode {
  kind: 'post';
  id: string;
  label: string;
  country: string;
  region: string;
  lat: number;
  lng: number;
  count: number;
  post: CityPost;
  cover: string;
}

type MarkerNode = CountryNode | LocationNode | PostNode;

const ATLAS_CARD_CLASSNAME =
  'group min-w-[224px] max-w-[224px] appearance-none overflow-hidden rounded-[1.5rem] border text-left outline-none ring-0 transition duration-300 focus:outline-none focus:ring-0';
const ATLAS_CARD_INACTIVE_CLASSNAME =
  'border-[rgba(249,115,22,0.08)] bg-[linear-gradient(180deg,rgba(255,255,255,0.86),rgba(255,250,245,0.94))] hover:-translate-y-0.5 hover:border-[rgba(249,115,22,0.14)]';
const ATLAS_CARD_ACTIVE_CLASSNAME =
  'border-[rgba(249,115,22,0.18)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(255,246,238,0.98))]';
type GlobeComponentType = ComponentType<
  GlobeProps & { ref?: MutableRefObject<GlobeMethods | undefined> }
>;

const ZOOM_SCALE: Record<ZoomTier, number> = {
  world: 0.9,
  region: 2.72,
  place: 3.78,
};
const MIN_GLOBE_SCALE = 0.84;
const MAX_GLOBE_SCALE = 4.42;
const GLOBE_IMAGE_URL = 'https://r2.mskyurina.top/globe/b3c9a3afc8968a6e.webp';
const GLOBE_BUMP_IMAGE_URL =
  'https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-topology.png';
const DEFAULT_GLOBE_LAT = 16;
const DEFAULT_GLOBE_LNG = -53;

function sortPosts(posts: CityPost[]) {
  return [...posts].sort((left, right) => {
    if (left.sortOrder !== right.sortOrder) {
      return left.sortOrder - right.sortOrder;
    }

    return left.city.localeCompare(right.city);
  });
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getDefaultOriginRect(): CardRect {
  if (typeof window === 'undefined') {
    return { x: 0, y: 0, width: 0, height: 0 };
  }

  const width = Math.min(window.innerWidth - 32, 480);
  const height = Math.min(window.innerHeight - 48, 620);

  return {
    x: (window.innerWidth - width) / 2,
    y: (window.innerHeight - height) / 2,
    width,
    height,
  };
}

function globeScaleToAltitude(scale: number) {
  const progress =
    (clamp(scale, MIN_GLOBE_SCALE, MAX_GLOBE_SCALE) - MIN_GLOBE_SCALE) /
    (MAX_GLOBE_SCALE - MIN_GLOBE_SCALE);

  return clamp(2.2 - progress * 1.6, 0.6, 2.2);
}

function getGlobeView(lat: number, lng: number, scale: number) {
  return {
    lat,
    lng,
    altitude: globeScaleToAltitude(scale),
  };
}

function isNodeVisibleFromView(
  node: { lat: number; lng: number },
  view: { lat: number; lng: number },
) {
  const [nodeX, nodeY, nodeZ] = latLngToXYZ(node.lat, node.lng);
  const [viewX, viewY, viewZ] = latLngToXYZ(view.lat, view.lng);

  return nodeX * viewX + nodeY * viewY + nodeZ * viewZ > 0;
}

function getZoomTier(scale: number): ZoomTier {
  if (scale < 1.62) {
    return 'world';
  }

  if (scale < 3.86) {
    return 'region';
  }

  return 'place';
}

function averageCoordinates(points: Array<{ lat: number; lng: number }>) {
  const total = points.reduce(
    (acc, point) => ({
      lat: acc.lat + point.lat,
      lng: acc.lng + point.lng,
    }),
    { lat: 0, lng: 0 },
  );

  return {
    lat: total.lat / points.length,
    lng: total.lng / points.length,
  };
}

function buildLocationNodes(posts: CityPost[]) {
  const groups = new Map<string, LocationNode>();

  for (const post of posts) {
    if (!post.location) {
      continue;
    }

    const key = `${post.location.country}:${post.location.locationName}`;
    const existing = groups.get(key);

    if (existing) {
      existing.posts.push(post);
      existing.count += 1;
      continue;
    }

    groups.set(key, {
      kind: 'location',
      id: `location-${key.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      label: post.location.locationName,
      country: post.location.country,
      region: post.location.region,
      lat: post.location.latitude,
      lng: post.location.longitude,
      count: 1,
      posts: [post],
      cover: post.cover,
    });
  }

  return [...groups.values()].sort((left, right) =>
    left.label.localeCompare(right.label),
  );
}

function buildCountryNodes(locations: LocationNode[]) {
  const groups = new Map<string, CountryNode>();

  for (const location of locations) {
    const existing = groups.get(location.country);

    if (existing) {
      existing.locations.push(location);
      existing.count += 1;
      existing.postCount += location.posts.length;
      const average = averageCoordinates(
        existing.locations.map((item) => ({ lat: item.lat, lng: item.lng })),
      );
      existing.lat = average.lat;
      existing.lng = average.lng;
      continue;
    }

    groups.set(location.country, {
      kind: 'country',
      id: `country-${location.country.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      label: location.country,
      lat: location.lat,
      lng: location.lng,
      count: 1,
      postCount: location.posts.length,
      locations: [location],
      cover: location.cover,
    });
  }

  return [...groups.values()].sort((left, right) =>
    left.label.localeCompare(right.label),
  );
}

function wrapLongitude(lng: number) {
  return ((lng + 540) % 360) - 180;
}

function offsetCoordinates(
  lat: number,
  lng: number,
  index: number,
  total: number,
) {
  if (total <= 1) {
    return { lat, lng };
  }

  const angle = (Math.PI * 2 * index) / total - Math.PI / 2;
  const radius = 1.35 + Math.floor(index / 6) * 0.55;
  const latOffset = Math.sin(angle) * radius;
  const lngOffset =
    (Math.cos(angle) * radius) /
    Math.max(Math.cos((lat * Math.PI) / 180), 0.35);

  return {
    lat: clamp(lat + latOffset, -85, 85),
    lng: wrapLongitude(lng + lngOffset),
  };
}

function buildPostNodes(location: LocationNode | undefined): PostNode[] {
  if (!location) {
    return [];
  }

  return location.posts.map<PostNode>((post, index) => {
    const coords = offsetCoordinates(
      location.lat,
      location.lng,
      index,
      location.posts.length,
    );

    return {
      kind: 'post',
      id: `post-${post.id}`,
      label: post.location?.locationName ?? post.city,
      country: location.country,
      region: location.region,
      lat: coords.lat,
      lng: coords.lng,
      count: 1,
      post,
      cover: post.cover,
    };
  });
}

function buildAllPostNodes(locations: LocationNode[]) {
  return locations.flatMap((location) => buildPostNodes(location));
}

function latLngToXYZ(lat: number, lng: number) {
  const latRadians = (lat * Math.PI) / 180;
  const lngRadians = (lng * Math.PI) / 180 - Math.PI;
  const cosLat = Math.cos(latRadians);

  return [
    -cosLat * Math.cos(lngRadians),
    Math.sin(latRadians),
    cosLat * Math.sin(lngRadians),
  ] as const;
}

function getMarkerButtonStyle(position: {
  x: number;
  y: number;
  visible: boolean;
}): CSSProperties {
  return {
    position: 'absolute',
    left: `${position.x * 100}%`,
    top: `${position.y * 100}%`,
    width: '5rem',
    height: '5rem',
    opacity: position.visible ? 1 : 0,
    transform: `translate(-50%, -50%) scale(${position.visible ? 1 : 0.85})`,
    transition: 'opacity 220ms ease, transform 220ms ease',
  };
}

function getMarkerLabelTransform(position: {
  x: number;
  y: number;
  visible: boolean;
}) {
  if (position.x > 0.74) {
    return 'translate(calc(-100% - 18px), -50%)';
  }

  if (position.x < 0.26) {
    return 'translate(18px, -50%)';
  }

  if (position.y > 0.76) {
    return 'translate(-50%, calc(-100% - 18px))';
  }

  return 'translate(-50%, 18px)';
}

function getCenteredNodeId(
  projectedNodes: Array<{
    node: MarkerNode;
    position: { x: number; y: number; visible: boolean };
  }>,
  currentId: string | null,
) {
  const visibleNodes = projectedNodes
    .filter(({ position }) => position.visible)
    .map(({ node, position }) => ({
      id: node.id,
      distance: Math.hypot(position.x - 0.5, position.y - 0.5),
    }))
    .sort((left, right) => left.distance - right.distance);

  const nearest = visibleNodes[0];
  if (!nearest) {
    return currentId;
  }

  const current = currentId
    ? (visibleNodes.find((item) => item.id === currentId) ?? null)
    : null;

  if (!current) {
    return nearest.id;
  }

  if (current.distance > 0.16) {
    return nearest.id;
  }

  if (
    nearest.id !== current.id &&
    nearest.distance + 0.035 < current.distance
  ) {
    return nearest.id;
  }

  return current.id;
}

function GlobeStage({
  nodes,
  cameraTarget,
  cameraFocusKey,
  focusOverlay,
  autoRotateEnabled,
  zoomScale,
  zoomTier,
  activeMarkerId,
  hoveredMarkerId,
  onHoverMarker,
  onSelectMarker,
  onZoomScaleChange,
  onCenteredMarkerChange,
  onGlobeLeave,
}: {
  nodes: MarkerNode[];
  cameraTarget: MarkerNode | null;
  cameraFocusKey: number;
  focusOverlay: {
    eyebrow: string;
    title: string;
    meta: string;
  };
  autoRotateEnabled: boolean;
  zoomScale: number;
  zoomTier: ZoomTier;
  activeMarkerId: string | null;
  hoveredMarkerId: string | null;
  onHoverMarker: (id: string | null) => void;
  onSelectMarker: (id: string) => void;
  onZoomScaleChange: (value: number | ((prev: number) => number)) => void;
  onCenteredMarkerChange: (id: string | null) => void;
  onGlobeLeave: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const globeRef = useRef<GlobeMethods>();
  const buttonRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const labelRefs = useRef<Record<string, HTMLSpanElement | null>>({});
  const [GlobeComponent, setGlobeComponent] =
    useState<GlobeComponentType | null>(null);
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const [isGlobeReady, setIsGlobeReady] = useState(false);
  const nodesRef = useRef<MarkerNode[]>(nodes);
  const viewportRef = useRef(viewport);
  const isPointerOverGlobeRef = useRef(false);
  const centeredMarkerIdRef = useRef<string | null>(null);
  const centeredCandidateRef = useRef<{
    id: string | null;
    since: number;
  }>({
    id: null,
    since: 0,
  });
  const hoveredMarkerIdRef = useRef<string | null>(hoveredMarkerId);
  const activeMarkerIdRef = useRef<string | null>(activeMarkerId);
  const centeredMarkerChangeRef = useRef(onCenteredMarkerChange);
  const lastCameraTargetIdRef = useRef<string | null>(cameraTarget?.id ?? null);
  const lastFocusKeyRef = useRef(cameraFocusKey);
  const zoomScaleChangeRef = useRef(onZoomScaleChange);
  const wheelMomentumRef = useRef(0);
  const wheelFrameRef = useRef<number | null>(null);
  const lastWheelEventAtRef = useRef(0);
  const isWheelZoomingRef = useRef(false);
  const focusTransitionUntilRef = useRef(0);
  const focusTransitionTimerRef = useRef<number | null>(null);
  const pointerPositionRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    let isCancelled = false;

    void import('react-globe.gl').then((module) => {
      if (!isCancelled) {
        setGlobeComponent(() => module.default as GlobeComponentType);
      }
    });

    return () => {
      isCancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    const observer = new ResizeObserver(([entry]) => {
      const nextWidth = Math.round(entry.contentRect.width);
      const nextHeight = Math.round(entry.contentRect.height);

      setViewport((prev) =>
        prev.width === nextWidth && prev.height === nextHeight
          ? prev
          : { width: nextWidth, height: nextHeight },
      );
    });

    observer.observe(containerRef.current);
    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    viewportRef.current = viewport;
  }, [viewport]);

  useEffect(() => {
    if (
      isGlobeReady ||
      !GlobeComponent ||
      viewport.width === 0 ||
      viewport.height === 0
    ) {
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      setIsGlobeReady(true);
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [GlobeComponent, isGlobeReady, viewport.height, viewport.width]);

  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  useEffect(() => {
    hoveredMarkerIdRef.current = hoveredMarkerId;
  }, [hoveredMarkerId]);

  useEffect(() => {
    activeMarkerIdRef.current = activeMarkerId;
  }, [activeMarkerId]);

  useEffect(() => {
    centeredMarkerChangeRef.current = onCenteredMarkerChange;
  }, [onCenteredMarkerChange]);

  useEffect(() => {
    zoomScaleChangeRef.current = onZoomScaleChange;
  }, [onZoomScaleChange]);

  useEffect(() => {
    if (!isGlobeReady || !globeRef.current) {
      return;
    }

    const currentView = globeRef.current.pointOfView();
    const hasFocusShift =
      lastFocusKeyRef.current !== cameraFocusKey ||
      lastCameraTargetIdRef.current !== (cameraTarget?.id ?? null);
    const focusDuration = hasFocusShift ? (cameraTarget ? 1150 : 680) : 0;
    const nextView = hasFocusShift
      ? cameraTarget
        ? getGlobeView(cameraTarget.lat, cameraTarget.lng, zoomScale)
        : getGlobeView(DEFAULT_GLOBE_LAT, DEFAULT_GLOBE_LNG, zoomScale)
      : {
          lat: currentView.lat,
          lng: currentView.lng,
          altitude: globeScaleToAltitude(zoomScale),
        };

    globeRef.current.pointOfView(
      nextView,
      hasFocusShift ? focusDuration : isWheelZoomingRef.current ? 0 : 150,
    );

    if (hasFocusShift) {
      focusTransitionUntilRef.current = performance.now() + focusDuration + 80;

      const controls = globeRef.current.controls();
      controls.autoRotate = false;

      if (focusTransitionTimerRef.current !== null) {
        window.clearTimeout(focusTransitionTimerRef.current);
      }

      focusTransitionTimerRef.current = window.setTimeout(() => {
        const nextControls = globeRef.current?.controls();
        if (!nextControls) {
          return;
        }

        nextControls.autoRotate =
          autoRotateEnabled && !isPointerOverGlobeRef.current;
      }, focusDuration + 40);
    }

    lastFocusKeyRef.current = cameraFocusKey;
    lastCameraTargetIdRef.current = cameraTarget?.id ?? null;
  }, [
    autoRotateEnabled,
    cameraFocusKey,
    cameraTarget,
    isGlobeReady,
    zoomScale,
  ]);

  useEffect(() => {
    if (!isGlobeReady || !globeRef.current) {
      return;
    }

    const controls = globeRef.current.controls();
    controls.enablePan = false;
    controls.enableZoom = false;
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.rotateSpeed = zoomTier === 'world' ? 0.85 : 0.65;
    controls.autoRotate = autoRotateEnabled && !isPointerOverGlobeRef.current;
    controls.autoRotateSpeed = zoomTier === 'world' ? 0.55 : 0.32;
  }, [autoRotateEnabled, isGlobeReady, zoomTier]);

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      pointerPositionRef.current = {
        x: event.clientX,
        y: event.clientY,
      };
    };

    window.addEventListener('pointermove', handlePointerMove, {
      passive: true,
    });

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
    };
  }, []);

  useEffect(() => {
    if (
      !isGlobeReady ||
      !globeRef.current ||
      viewport.width === 0 ||
      viewport.height === 0
    ) {
      return;
    }

    let frameId = 0;

    const animate = () => {
      const globe = globeRef.current;
      const { width, height } = viewportRef.current;
      if (!globe || width === 0 || height === 0) {
        frameId = window.requestAnimationFrame(animate);
        return;
      }

      const pointer = pointerPositionRef.current;
      const containerRect =
        containerRef.current?.getBoundingClientRect() ?? null;
      const isPointerWithinContainer = Boolean(
        pointer &&
          containerRect &&
          pointer.x >= containerRect.left &&
          pointer.x <= containerRect.right &&
          pointer.y >= containerRect.top &&
          pointer.y <= containerRect.bottom,
      );

      if (isPointerOverGlobeRef.current !== isPointerWithinContainer) {
        isPointerOverGlobeRef.current = isPointerWithinContainer;
        globe.controls().autoRotate =
          autoRotateEnabled && !isPointerWithinContainer;
      }

      const currentNodes = nodesRef.current;
      const view = globe.pointOfView();
      const projectedNodes = currentNodes.map((node) => {
        const screen = globe.getScreenCoords(node.lat, node.lng, 0.015);
        const x = screen.x / width;
        const y = screen.y / height;
        const visible =
          isNodeVisibleFromView(node, view) &&
          x >= -0.08 &&
          x <= 1.08 &&
          y >= -0.08 &&
          y <= 1.08;

        return {
          node,
          position: { x, y, visible },
        };
      });

      for (const { node, position } of projectedNodes) {
        const button = buttonRefs.current[node.id];
        if (!button) {
          continue;
        }

        const isActive = activeMarkerIdRef.current === node.id;
        const isHovered = hoveredMarkerIdRef.current === node.id;
        const shouldShowLabel = isActive || isHovered;
        const zIndex = isHovered
          ? 1200
          : shouldShowLabel
            ? 1100
            : Math.round(position.y * 100);

        button.style.left = `${position.x * 100}%`;
        button.style.top = `${position.y * 100}%`;
        button.style.opacity = position.visible ? '1' : '0';
        button.style.transform = `translate(-50%, -50%) scale(${position.visible ? 1 : 0.85})`;
        button.style.pointerEvents = position.visible ? 'auto' : 'none';
        button.style.zIndex = `${zIndex}`;

        const label = labelRefs.current[node.id];
        if (label) {
          label.style.transform = getMarkerLabelTransform(position);
        }
      }

      const now = performance.now();
      const nextCenteredId = getCenteredNodeId(
        projectedNodes,
        centeredMarkerIdRef.current,
      );

      if (nextCenteredId !== centeredCandidateRef.current.id) {
        centeredCandidateRef.current = {
          id: nextCenteredId,
          since: now,
        };
      } else if (
        nextCenteredId !== centeredMarkerIdRef.current &&
        now - centeredCandidateRef.current.since > 140 &&
        now >= focusTransitionUntilRef.current &&
        !hoveredMarkerIdRef.current
      ) {
        centeredMarkerIdRef.current = nextCenteredId;
        centeredMarkerChangeRef.current(nextCenteredId);
      }

      frameId = window.requestAnimationFrame(animate);
    };

    frameId = window.requestAnimationFrame(animate);

    return () => {
      if (frameId) {
        window.cancelAnimationFrame(frameId);
      }
      if (focusTransitionTimerRef.current !== null) {
        window.clearTimeout(focusTransitionTimerRef.current);
        focusTransitionTimerRef.current = null;
      }
    };
  }, [isGlobeReady, viewport]);

  const handlePointerEnter = () => {
    isPointerOverGlobeRef.current = true;
    const controls = globeRef.current?.controls();
    if (controls) {
      controls.autoRotate = false;
    }
  };

  const handlePointerLeave = () => {
    isPointerOverGlobeRef.current = false;
    const controls = globeRef.current?.controls();
    if (controls) {
      controls.autoRotate = autoRotateEnabled;
    }
    onHoverMarker(null);
    onGlobeLeave();
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const runWheelInertia = () => {
      const momentum = wheelMomentumRef.current;
      if (Math.abs(momentum) < 0.0025) {
        wheelMomentumRef.current = 0;
        wheelFrameRef.current = null;
        isWheelZoomingRef.current = false;
        return;
      }

      zoomScaleChangeRef.current((current) =>
        clamp(current + momentum, MIN_GLOBE_SCALE, MAX_GLOBE_SCALE),
      );

      const now = performance.now();
      const isStillScrolling = now - lastWheelEventAtRef.current < 110;

      wheelMomentumRef.current *= isStillScrolling ? 0.91 : 0.88;
      wheelFrameRef.current = window.requestAnimationFrame(runWheelInertia);
    };

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      event.stopPropagation();

      const delta =
        event.deltaMode === WheelEvent.DOM_DELTA_LINE
          ? event.deltaY * 12
          : event.deltaY;
      const nextStep = clamp(Math.abs(delta) / 360, 0.07, 0.17);
      const direction = delta > 0 ? -1 : 1;
      const immediateStep = nextStep * direction;

      isWheelZoomingRef.current = true;
      lastWheelEventAtRef.current = performance.now();

      zoomScaleChangeRef.current((current) =>
        clamp(current + immediateStep, MIN_GLOBE_SCALE, MAX_GLOBE_SCALE),
      );

      wheelMomentumRef.current = immediateStep * 0.28;

      if (wheelFrameRef.current) {
        return;
      }

      wheelFrameRef.current = window.requestAnimationFrame(runWheelInertia);
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      container.removeEventListener('wheel', handleWheel);
      if (wheelFrameRef.current) {
        window.cancelAnimationFrame(wheelFrameRef.current);
        wheelFrameRef.current = null;
      }
      isWheelZoomingRef.current = false;
      wheelMomentumRef.current = 0;
    };
  }, []);

  return (
    <div className="relative lg:mx-auto lg:w-full lg:max-w-[980px]">
      <div
        className={cn(
          'relative overflow-hidden rounded-[2rem] border border-orange-500/15 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.98),_rgba(255,247,237,0.92)_48%,_rgba(255,237,213,0.76)_100%)] p-4 shadow-[0_24px_70px_-40px_rgba(154,52,18,0.45)] sm:p-6',
          'before:pointer-events-none before:absolute before:inset-x-10 before:top-3 before:h-24 before:rounded-full before:bg-white/70 before:blur-3xl',
        )}
      >
        <div
          ref={containerRef}
          className="relative z-10 mx-auto aspect-[16/10] w-full max-w-[920px] cursor-grab touch-none overflow-hidden rounded-[1.75rem] border border-white/55 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.9),_rgba(255,247,237,0.48)_42%,_rgba(255,237,213,0.18)_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] active:cursor-grabbing sm:aspect-[8/5] lg:h-[min(66vh,680px)] lg:w-full lg:max-w-none"
          onPointerEnter={handlePointerEnter}
          onPointerLeave={handlePointerLeave}
        >
          <div className="pointer-events-none absolute inset-0 rounded-[inherit] bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.82)_0%,_rgba(255,247,237,0.28)_48%,_rgba(251,191,36,0)_78%)] blur-2xl" />
          {!isGlobeReady && (
            <div className="absolute inset-0 z-10 grid place-items-center">
              <div className="relative h-24 w-24">
                <div className="absolute inset-0 rounded-full border border-orange-200/70 bg-white/35 backdrop-blur-sm" />
                <div className="absolute inset-2 animate-spin rounded-full border border-orange-300/70 border-t-[--orange-8]" />
                <div className="absolute inset-[26px] rounded-full bg-white/70 shadow-[0_0_40px_rgba(255,255,255,0.8)]" />
              </div>
            </div>
          )}
          {viewport.width > 0 && viewport.height > 0 && GlobeComponent ? (
            <div className="absolute inset-0 overflow-hidden rounded-[inherit]">
              <GlobeComponent
                ref={globeRef}
                width={viewport.width}
                height={viewport.height}
                backgroundColor="rgba(0,0,0,0)"
                globeImageUrl={GLOBE_IMAGE_URL}
                bumpImageUrl={GLOBE_BUMP_IMAGE_URL}
                waitForGlobeReady={false}
                showAtmosphere
                atmosphereColor="#f1c58d"
                atmosphereAltitude={0.12}
                enablePointerInteraction
                showPointerCursor={false}
                onGlobeReady={() => {
                  setIsGlobeReady(true);
                }}
              />
            </div>
          ) : null}

          <div
            className={cn(
              'pointer-events-none absolute inset-0 z-20 transition-opacity duration-300',
              isGlobeReady ? 'opacity-100' : 'opacity-0',
            )}
          >
            {nodes.map((node) => {
              const isActive = node.id === activeMarkerId;
              const isHovered = node.id === hoveredMarkerId;
              const shouldShowLabel = isActive || isHovered;

              return (
                <button
                  key={node.id}
                  type="button"
                  ref={(element) => {
                    buttonRefs.current[node.id] = element;
                  }}
                  className="group overflow-visible"
                  data-marker-button="true"
                  data-node-id={node.id}
                  style={{
                    ...getMarkerButtonStyle({
                      x: 0.5,
                      y: 0.5,
                      visible: false,
                    }),
                    pointerEvents: 'none',
                  }}
                  onMouseDown={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    onSelectMarker(node.id);
                  }}
                  onMouseEnter={() => onHoverMarker(node.id)}
                  onMouseLeave={() => onHoverMarker(null)}
                  onFocus={() => onHoverMarker(node.id)}
                  onBlur={() => onHoverMarker(null)}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                  }}
                  aria-label={node.label}
                >
                  <span
                    className={cn(
                      'absolute left-1/2 top-1/2 z-10 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border border-orange-50/90 bg-[--orange-8] shadow-[0_0_0_6px_rgba(251,146,60,0.1)] transition',
                      isActive &&
                        'h-4 w-4 shadow-[0_0_0_10px_rgba(251,146,60,0.16)]',
                      isHovered && 'scale-125',
                    )}
                  />
                  <span
                    className={cn(
                      'absolute left-1/2 top-1/2 z-0 h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full border border-orange-200/35 bg-orange-200/10 opacity-0 transition duration-300',
                      (isActive || isHovered) && 'animate-pulse opacity-100',
                    )}
                  />
                  <span
                    ref={(element) => {
                      labelRefs.current[node.id] = element;
                    }}
                    style={{ transform: 'translate(-50%, 18px)' }}
                    className={cn(
                      'absolute left-1/2 top-1/2 z-20 flex items-center gap-2 rounded-full border border-orange-500/10 bg-white/90 px-3.5 py-2 text-sm font-medium text-[--orange-9] shadow-lg shadow-orange-900/10 backdrop-blur-md transition',
                      shouldShowLabel
                        ? 'opacity-100'
                        : 'pointer-events-none opacity-0',
                    )}
                  >
                    {node.count > 1 && (
                      <span className="grid h-5 min-w-5 place-items-center rounded-full bg-orange-100 px-1.5 text-[11px] font-semibold text-[--orange-8]">
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
      </div>
    </div>
  );
}

export function GlobeAtlas({ posts }: GlobeAtlasProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const atlasPosts = useMemo(
    () => sortPosts(posts.filter((post) => post.location)),
    [posts],
  );
  const locationNodes = useMemo(
    () => buildLocationNodes(atlasPosts),
    [atlasPosts],
  );
  const countryNodes = useMemo(
    () => buildCountryNodes(locationNodes),
    [locationNodes],
  );
  const [zoomScale, setZoomScale] = useState(ZOOM_SCALE.world);
  const [selectedCountryId, setSelectedCountryId] = useState(
    countryNodes[0]?.id ?? '',
  );
  const [selectedLocationId, setSelectedLocationId] = useState(
    locationNodes[0]?.id ?? '',
  );
  const [activePostId, setActivePostId] = useState(atlasPosts[0]?.id ?? '');
  const [cameraTargetId, setCameraTargetId] = useState<string | null>(
    countryNodes[0]?.id ?? null,
  );
  const [cameraFocusKey, setCameraFocusKey] = useState(0);
  const [isAutoRotateFrozen, setIsAutoRotateFrozen] = useState(false);
  const [hoveredMarkerId, setHoveredMarkerId] = useState<string | null>(null);
  const [viewerState, setViewerState] = useState<{
    id: string;
    originRect: CardRect;
  } | null>(null);
  const [displayZoomTier, setDisplayZoomTier] = useState<ZoomTier>(() =>
    getZoomTier(ZOOM_SCALE.world),
  );
  const zoomTier = getZoomTier(zoomScale);

  useEffect(() => {
    if (zoomTier === displayZoomTier) {
      return;
    }

    const timerId = window.setTimeout(() => {
      setDisplayZoomTier(zoomTier);
    }, 150);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [displayZoomTier, zoomTier]);
  useEffect(() => {
    if (!countryNodes.length || !locationNodes.length || !atlasPosts.length) {
      return;
    }

    setSelectedCountryId((prev) =>
      countryNodes.some((node) => node.id === prev) ? prev : countryNodes[0].id,
    );
    setSelectedLocationId((prev) =>
      locationNodes.some((node) => node.id === prev)
        ? prev
        : locationNodes[0].id,
    );
    setActivePostId((prev) =>
      atlasPosts.some((post) => post.id === prev) ? prev : atlasPosts[0].id,
    );
    setCameraTargetId((prev) =>
      prev && countryNodes.some((node) => node.id === prev)
        ? prev
        : countryNodes[0].id,
    );
  }, [atlasPosts, countryNodes, locationNodes]);

  const selectedCountry = useMemo(
    () =>
      countryNodes.find((node) => node.id === selectedCountryId) ??
      countryNodes[0],
    [countryNodes, selectedCountryId],
  );
  const selectedLocation = useMemo(
    () =>
      locationNodes.find((node) => node.id === selectedLocationId) ??
      locationNodes[0],
    [locationNodes, selectedLocationId],
  );
  const activePost = useMemo(
    () => atlasPosts.find((post) => post.id === activePostId) ?? atlasPosts[0],
    [activePostId, atlasPosts],
  );
  const viewerPost = useMemo(
    () => atlasPosts.find((post) => post.id === viewerState?.id) ?? null,
    [atlasPosts, viewerState?.id],
  );

  const regionNodes = useMemo(() => {
    if (!selectedCountry) {
      return locationNodes;
    }

    return locationNodes.filter(
      (node) => node.country === selectedCountry.label,
    );
  }, [locationNodes, selectedCountry]);

  const activeMarkerId = useMemo(() => {
    if (displayZoomTier === 'world') {
      return selectedCountry?.id ?? null;
    }

    if (displayZoomTier === 'place') {
      return `post-${activePost?.id ?? ''}`;
    }

    return selectedLocation?.id ?? null;
  }, [activePost?.id, displayZoomTier, selectedCountry, selectedLocation]);

  const dockItems = useMemo(() => {
    if (displayZoomTier === 'world') {
      return countryNodes;
    }

    if (displayZoomTier === 'region') {
      return regionNodes;
    }

    return selectedLocation?.posts ?? [];
  }, [countryNodes, displayZoomTier, regionNodes, selectedLocation?.posts]);

  const focusOverlay = useMemo(() => {
    if (displayZoomTier === 'world') {
      return {
        eyebrow: 'Country',
        title: selectedCountry?.label ?? '',
        meta: selectedCountry
          ? `${selectedCountry.count} places, ${selectedCountry.postCount} posts`
          : '',
      };
    }

    if (displayZoomTier === 'region') {
      return {
        eyebrow: 'Place',
        title: selectedLocation?.label ?? '',
        meta: selectedLocation?.region ?? '',
      };
    }

    return {
      eyebrow: 'Post',
      title: activePost?.city ?? '',
      meta: activePost?.location?.country ?? selectedCountry?.label ?? '',
    };
  }, [activePost, displayZoomTier, selectedCountry, selectedLocation]);

  const postNodes = useMemo(
    () => buildAllPostNodes(locationNodes),
    [locationNodes],
  );

  const allNodes = useMemo(
    () => [...countryNodes, ...locationNodes, ...postNodes],
    [countryNodes, locationNodes, postNodes],
  );

  const globeNodes = useMemo(() => {
    if (displayZoomTier === 'world') {
      return countryNodes;
    }

    if (displayZoomTier === 'region') {
      return locationNodes;
    }

    return postNodes;
  }, [countryNodes, displayZoomTier, locationNodes, postNodes]);

  const cameraTarget = useMemo<MarkerNode | null>(() => {
    if (!cameraTargetId) {
      return null;
    }

    return allNodes.find((node) => node.id === cameraTargetId) ?? null;
  }, [allNodes, cameraTargetId]);

  useEffect(() => {
    if (!selectedLocation) {
      return;
    }

    const parentCountryId =
      countryNodes.find((node) => node.label === selectedLocation.country)
        ?.id ?? null;
    if (!parentCountryId || parentCountryId === selectedCountryId) {
      return;
    }

    setSelectedCountryId(parentCountryId);
  }, [countryNodes, selectedCountryId, selectedLocation]);

  if (
    !atlasPosts.length ||
    !selectedCountry ||
    !selectedLocation ||
    !activePost
  ) {
    return null;
  }

  const openViewer = (postId: string, element?: HTMLElement | null) => {
    const rect = element?.getBoundingClientRect();

    setViewerState({
      id: postId,
      originRect: rect
        ? {
            x: rect.left,
            y: rect.top,
            width: rect.width,
            height: rect.height,
          }
        : getDefaultOriginRect(),
    });
  };

  const handleZoomScaleChange = (
    value: number | ((prev: number) => number),
  ) => {
    setZoomScale((current) => {
      const nextValue = typeof value === 'function' ? value(current) : value;
      return clamp(nextValue, MIN_GLOBE_SCALE, MAX_GLOBE_SCALE);
    });
  };

  const focusCamera = (
    targetId: string,
    options?: { freezeRotation?: boolean },
  ) => {
    setCameraTargetId(targetId);
    setIsAutoRotateFrozen(Boolean(options?.freezeRotation));
    setCameraFocusKey((current) => current + 1);
  };

  const handleMarkerSelection = (
    markerId: string,
    options?: { freezeRotation?: boolean },
  ) => {
    setIsAutoRotateFrozen(Boolean(options?.freezeRotation));
    const countryNode = countryNodes.find((node) => node.id === markerId);
    if (countryNode) {
      setSelectedCountryId(countryNode.id);
      setSelectedLocationId(
        countryNode.locations[0]?.id ?? selectedLocation.id,
      );
      setActivePostId(countryNode.locations[0]?.posts[0]?.id ?? activePost.id);
      focusCamera(countryNode.id, options);
      setDisplayZoomTier('region');
      setZoomScale((current) => Math.max(current, ZOOM_SCALE.region));
      return;
    }

    const postNode = postNodes.find((node) => node.id === markerId);
    if (postNode) {
      const parentLocationId =
        locationNodes.find(
          (node) =>
            node.label === (postNode.post.location?.locationName ?? '') &&
            node.country === postNode.country,
        )?.id ?? null;
      const parentCountryId =
        countryNodes.find((node) => node.label === postNode.country)?.id ??
        null;

      if (parentCountryId) {
        setSelectedCountryId(parentCountryId);
      }
      if (parentLocationId) {
        setSelectedLocationId(parentLocationId);
      }
      setActivePostId(postNode.post.id);
      focusCamera(postNode.id, options);
      openViewer(postNode.post.id);
      return;
    }

    const locationNode = locationNodes.find((node) => node.id === markerId);
    if (!locationNode) {
      return;
    }

    setSelectedCountryId(
      countryNodes.find((node) => node.label === locationNode.country)?.id ??
        selectedCountry.id,
    );
    setSelectedLocationId(locationNode.id);
    setActivePostId(locationNode.posts[0]?.id ?? activePost.id);
    focusCamera(locationNode.id, options);
    setDisplayZoomTier('place');
    setZoomScale((current) => Math.max(current, ZOOM_SCALE.place));
  };

  const handleCenteredMarkerChange = (markerId: string | null) => {
    if (!markerId) {
      return;
    }

    const countryNode = countryNodes.find((node) => node.id === markerId);
    if (countryNode) {
      setSelectedCountryId((current) =>
        current === countryNode.id ? current : countryNode.id,
      );

      const firstLocationId = countryNode.locations[0]?.id;
      if (firstLocationId) {
        setSelectedLocationId((current) =>
          current === firstLocationId ? current : firstLocationId,
        );
      }

      const firstPostId = countryNode.locations[0]?.posts[0]?.id;
      if (firstPostId) {
        setActivePostId((current) =>
          current === firstPostId ? current : firstPostId,
        );
      }
      return;
    }

    const postNode = postNodes.find((node) => node.id === markerId);
    if (postNode) {
      const locationId =
        locationNodes.find(
          (node) =>
            node.label === (postNode.post.location?.locationName ?? '') &&
            node.country === postNode.country,
        )?.id ?? null;
      const parentCountryId =
        countryNodes.find((node) => node.label === postNode.country)?.id ??
        null;

      if (locationId) {
        setSelectedLocationId((current) =>
          current === locationId ? current : locationId,
        );
      }
      if (parentCountryId) {
        setSelectedCountryId((current) =>
          current === parentCountryId ? current : parentCountryId,
        );
      }

      setActivePostId((current) =>
        current === postNode.post.id ? current : postNode.post.id,
      );
      return;
    }

    const locationNode = locationNodes.find((node) => node.id === markerId);
    if (!locationNode) {
      return;
    }

    setSelectedLocationId((current) =>
      current === locationNode.id ? current : locationNode.id,
    );

    const parentCountryId =
      countryNodes.find((node) => node.label === locationNode.country)?.id ??
      null;
    if (parentCountryId) {
      setSelectedCountryId((current) =>
        current === parentCountryId ? current : parentCountryId,
      );
    }

    const firstPostId = locationNode.posts[0]?.id;
    if (firstPostId) {
      setActivePostId((current) =>
        current === firstPostId ? current : firstPostId,
      );
    }
  };

  return (
    <>
      <section
        ref={sectionRef}
        className="relative mx-auto w-full max-w-screen-xl px-4 pb-24 pt-10 sm:pb-28 sm:pt-14 lg:h-screen lg:px-6 lg:py-0"
      >
        <motion.div className="pointer-events-none absolute inset-x-4 top-8 h-64 rounded-[2.5rem] bg-[radial-gradient(circle_at_top,_rgba(251,191,36,0.1),_rgba(255,255,255,0)_65%)] blur-3xl lg:top-1/2 lg:h-80 lg:-translate-y-1/2" />

        <div className="relative mx-auto w-full max-w-[1120px] space-y-4 lg:flex lg:h-full lg:flex-col lg:items-center lg:justify-center lg:gap-6 lg:space-y-0 lg:py-8">
          <motion.div className="relative w-full lg:flex lg:flex-none lg:items-center lg:justify-center lg:pt-0">
            <GlobeStage
              nodes={globeNodes}
              cameraTarget={cameraTarget}
              cameraFocusKey={cameraFocusKey}
              focusOverlay={focusOverlay}
              autoRotateEnabled={!isAutoRotateFrozen}
              zoomScale={zoomScale}
              zoomTier={displayZoomTier}
              activeMarkerId={activeMarkerId}
              hoveredMarkerId={hoveredMarkerId}
              onHoverMarker={setHoveredMarkerId}
              onSelectMarker={handleMarkerSelection}
              onZoomScaleChange={handleZoomScaleChange}
              onCenteredMarkerChange={handleCenteredMarkerChange}
              onGlobeLeave={() => {
                setIsAutoRotateFrozen(false);
              }}
            />
          </motion.div>

          <motion.div
            layout
            className="overflow-visible rounded-[2rem] border border-orange-500/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.82),rgba(255,248,242,0.92))] p-3 shadow-[0_24px_60px_-42px_rgba(154,52,18,0.36)] backdrop-blur-xl sm:p-4 lg:mx-auto lg:w-full lg:max-w-[980px]"
          >
            <div className="-mx-1 flex gap-3 overflow-x-auto overflow-y-visible px-1 py-2">
              {displayZoomTier === 'world' &&
                (dockItems as CountryNode[]).map((country) => {
                  const isActive = country.id === selectedCountry.id;

                  return (
                    <button
                      key={country.id}
                      type="button"
                      onClick={() => {
                        handleMarkerSelection(country.id, {
                          freezeRotation: true,
                        });
                      }}
                      style={{ WebkitTapHighlightColor: 'transparent' }}
                      className={cn(
                        ATLAS_CARD_CLASSNAME,
                        isActive
                          ? ATLAS_CARD_ACTIVE_CLASSNAME
                          : ATLAS_CARD_INACTIVE_CLASSNAME,
                      )}
                    >
                      <div className="relative aspect-[4/4.6] overflow-hidden">
                        <Image
                          src={clipCDNImage(country.cover, {
                            width: 420,
                            quality: 78,
                          })}
                          alt={country.label}
                          fill
                          sizes="224px"
                          className="object-cover"
                          loading="lazy"
                        />
                        <div className="from-black/16 pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t via-black/0 to-transparent" />
                      </div>
                      <div className="px-4 py-3.5">
                        <p className="text-[18px] font-semibold tracking-tight text-neutral-900">
                          {country.label}
                        </p>
                        <p className="mt-1 text-[14px] leading-6 text-[--orange-8]">
                          {country.count} places, {country.postCount} posts
                        </p>
                      </div>
                    </button>
                  );
                })}

              {displayZoomTier === 'region' &&
                (dockItems as LocationNode[]).map((location) => {
                  const isActive = location.id === selectedLocation.id;

                  return (
                    <button
                      key={location.id}
                      type="button"
                      onClick={() => {
                        handleMarkerSelection(location.id, {
                          freezeRotation: true,
                        });
                      }}
                      style={{ WebkitTapHighlightColor: 'transparent' }}
                      className={cn(
                        ATLAS_CARD_CLASSNAME,
                        isActive
                          ? ATLAS_CARD_ACTIVE_CLASSNAME
                          : ATLAS_CARD_INACTIVE_CLASSNAME,
                      )}
                    >
                      <div className="relative aspect-[4/4.6] overflow-hidden">
                        <Image
                          src={clipCDNImage(location.cover, {
                            width: 420,
                            quality: 78,
                          })}
                          alt={location.label}
                          fill
                          sizes="224px"
                          className="object-cover"
                          loading="lazy"
                        />
                        <div className="from-black/16 pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t via-black/0 to-transparent" />
                      </div>
                      <div className="px-4 py-3.5">
                        <p className="text-[18px] font-semibold tracking-tight text-neutral-900">
                          {location.label}
                        </p>
                        <p className="mt-1 text-[14px] leading-6 text-[--orange-8]">
                          {location.region}
                        </p>
                      </div>
                    </button>
                  );
                })}

              {displayZoomTier === 'place' &&
                (dockItems as CityPost[]).map((post) => {
                  const isActive = post.id === activePost.id;

                  return (
                    <button
                      key={post.id}
                      type="button"
                      onClick={(event) => {
                        const parentLocationId =
                          locationNodes.find(
                            (node) =>
                              node.label ===
                                (post.location?.locationName ?? '') &&
                              node.country === post.location?.country,
                          )?.id ?? null;
                        const parentCountryId =
                          countryNodes.find(
                            (node) => node.label === post.location?.country,
                          )?.id ?? null;

                        if (parentCountryId) {
                          setSelectedCountryId(parentCountryId);
                        }
                        if (parentLocationId) {
                          setSelectedLocationId(parentLocationId);
                        }
                        setActivePostId(post.id);
                        setCameraTargetId(`post-${post.id}`);
                        setIsAutoRotateFrozen(true);
                        openViewer(post.id, event.currentTarget);
                      }}
                      style={{ WebkitTapHighlightColor: 'transparent' }}
                      className={cn(
                        ATLAS_CARD_CLASSNAME,
                        isActive
                          ? ATLAS_CARD_ACTIVE_CLASSNAME
                          : ATLAS_CARD_INACTIVE_CLASSNAME,
                      )}
                    >
                      <div className="relative aspect-[4/4.6] overflow-hidden">
                        <Image
                          src={clipCDNImage(post.cover, {
                            width: 420,
                            quality: 80,
                          })}
                          alt={post.city}
                          fill
                          sizes="224px"
                          className="object-cover"
                          loading="lazy"
                        />
                        <div className="from-black/18 pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t via-black/0 to-transparent" />
                      </div>
                      <div className="px-4 py-3.5">
                        <p className="text-[18px] font-semibold tracking-tight text-neutral-900">
                          {post.city}
                        </p>
                        <p className="mt-1 text-[14px] leading-6 text-[--orange-8]">
                          {post.location?.region}
                        </p>
                      </div>
                    </button>
                  );
                })}
            </div>
          </motion.div>
        </div>
      </section>

      <AnimatePresence mode="wait">
        {viewerPost && viewerState && (
          <ExpandedPost
            post={viewerPost}
            originRect={viewerState.originRect}
            onClose={() => setViewerState(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}

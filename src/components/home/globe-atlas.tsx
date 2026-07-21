'use client';

import {
  type CSSProperties,
  type ComponentType,
  type MutableRefObject,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ChevronRight, Minus, Plus, RotateCcw } from 'lucide-react';
import type { GlobeMethods, GlobeProps } from 'react-globe.gl';
import { MeshLambertMaterial } from 'three';

import { type CityPost } from '@/lib/collections';
import { cn } from '@/lib/utils';

import { ExpandedPost, type CardRect } from './images';
import { AtlasDockCard } from './atlas/atlas-dock-card';
import {
  MAX_GLOBE_SCALE,
  MIN_GLOBE_SCALE,
  ZOOM_SCALE,
  buildAllPostNodes,
  buildCountryNodes,
  buildLocationNodes,
  clamp,
  getCenteredNodeId,
  getZoomTier,
  latLngToXYZ,
  sortPosts,
  type CountryNode,
  type LocationNode,
  type MarkerNode,
  type PostNode,
  type ZoomTier,
} from './atlas/model';
import { ATLAS_TEXTURES, type AtlasTheme, getAtlasTheme } from './atlas/theme';
import type { SongDefinition } from './songs';

interface GlobeAtlasProps {
  posts: CityPost[];
  song: SongDefinition;
}

const ATLAS_CONTROL_CLASSNAME =
  'grid h-11 w-11 place-items-center text-[var(--atlas-ink)] outline-none transition-colors hover:bg-[var(--atlas-accent)] hover:text-[var(--atlas-on-accent)] focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-[var(--atlas-accent)] focus-visible:ring-inset';
type GlobeComponentType = ComponentType<
  GlobeProps & { ref?: MutableRefObject<GlobeMethods | undefined> }
>;

const DEFAULT_GLOBE_LAT = 28;
const DEFAULT_GLOBE_LNG = 18;

function getTouchDistance(touches: TouchList) {
  if (touches.length < 2) {
    return 0;
  }

  const [first, second] = [touches[0], touches[1]];
  return Math.hypot(
    second.clientX - first.clientX,
    second.clientY - first.clientY,
  );
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

function applyInitialGlobeView({
  globeRef,
  initialViewAppliedRef,
  lastCameraTargetIdRef,
  lastFocusKeyRef,
  cameraTarget,
  cameraFocusKey,
  zoomScale,
}: {
  globeRef: MutableRefObject<GlobeMethods | undefined>;
  initialViewAppliedRef: MutableRefObject<boolean>;
  lastCameraTargetIdRef: MutableRefObject<string | null>;
  lastFocusKeyRef: MutableRefObject<number>;
  cameraTarget: MarkerNode | null;
  cameraFocusKey: number;
  zoomScale: number;
}) {
  if (initialViewAppliedRef.current || !globeRef.current) {
    return false;
  }

  const initialView = cameraTarget
    ? getGlobeView(cameraTarget.lat, cameraTarget.lng, zoomScale)
    : getGlobeView(DEFAULT_GLOBE_LAT, DEFAULT_GLOBE_LNG, zoomScale);

  globeRef.current.pointOfView(initialView, 0);
  lastCameraTargetIdRef.current = cameraTarget?.id ?? null;
  lastFocusKeyRef.current = cameraFocusKey;
  initialViewAppliedRef.current = true;

  return true;
}

function isNodeVisibleFromView(
  node: { lat: number; lng: number },
  view: { lat: number; lng: number },
) {
  const [nodeX, nodeY, nodeZ] = latLngToXYZ(node.lat, node.lng);
  const [viewX, viewY, viewZ] = latLngToXYZ(view.lat, view.lng);

  return nodeX * viewX + nodeY * viewY + nodeZ * viewZ > 0;
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

function GlobeStage({
  nodes,
  cameraTarget,
  cameraFocusKey,
  autoRotateEnabled,
  zoomScale,
  zoomTier,
  activeMarkerId,
  hoveredMarkerId,
  onHoverMarker,
  onSelectMarker,
  onZoomScaleChange,
  onCenteredMarkerChange,
  onUserInteraction,
  theme,
  reduceMotion,
}: {
  nodes: MarkerNode[];
  cameraTarget: MarkerNode | null;
  cameraFocusKey: number;
  autoRotateEnabled: boolean;
  zoomScale: number;
  zoomTier: ZoomTier;
  activeMarkerId: string | null;
  hoveredMarkerId: string | null;
  onHoverMarker: (id: string | null) => void;
  onSelectMarker: (id: string) => void;
  onZoomScaleChange: (value: number | ((prev: number) => number)) => void;
  onCenteredMarkerChange: (id: string | null) => void;
  onUserInteraction: () => void;
  theme: AtlasTheme;
  reduceMotion: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const globeRef = useRef<GlobeMethods>();
  const buttonRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const labelRefs = useRef<Record<string, HTMLSpanElement | null>>({});
  const [GlobeComponent, setGlobeComponent] =
    useState<GlobeComponentType | null>(null);
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const [isGlobeReady, setIsGlobeReady] = useState(false);
  const [isStageActive, setIsStageActive] = useState(true);
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
  const userInteractionRef = useRef(onUserInteraction);
  const lastCameraTargetIdRef = useRef<string | null>(null);
  const lastFocusKeyRef = useRef(cameraFocusKey);
  const zoomScaleChangeRef = useRef(onZoomScaleChange);
  const zoomScaleRef = useRef(zoomScale);
  const wheelMomentumRef = useRef(0);
  const wheelFrameRef = useRef<number | null>(null);
  const lastWheelEventAtRef = useRef(0);
  const isWheelZoomingRef = useRef(false);
  const focusTransitionUntilRef = useRef(0);
  const focusTransitionTimerRef = useRef<number | null>(null);
  const initialViewAppliedRef = useRef(false);
  const pinchGestureRef = useRef<{
    distance: number;
    scale: number;
  } | null>(null);
  const autoRotateEnabledRef = useRef(autoRotateEnabled);
  const isPinchActiveRef = useRef(false);
  const globeMaterial = useMemo(
    () =>
      new MeshLambertMaterial({
        bumpScale: theme.globe.bumpScale,
        emissive: theme.globe.emissive,
        emissiveIntensity: 0.15,
      }),
    [theme.globe],
  );
  const surfaceTexture =
    viewport.width >= 720
      ? theme.globe.textures.detailed
      : theme.globe.textures.compact;

  useEffect(() => {
    return () => {
      globeMaterial.dispose();
    };
  }, [globeMaterial]);

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
    const container = containerRef.current;
    if (!container) {
      return;
    }

    let isInViewport = true;
    const syncActivity = () => {
      setIsStageActive(isInViewport && document.visibilityState === 'visible');
    };
    const observer = new IntersectionObserver(([entry]) => {
      isInViewport = entry.isIntersecting;
      syncActivity();
    });

    observer.observe(container);
    document.addEventListener('visibilitychange', syncActivity);
    syncActivity();

    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', syncActivity);
    };
  }, []);

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
    userInteractionRef.current = onUserInteraction;
  }, [onUserInteraction]);

  useEffect(() => {
    zoomScaleChangeRef.current = onZoomScaleChange;
  }, [onZoomScaleChange]);

  useEffect(() => {
    zoomScaleRef.current = zoomScale;
  }, [zoomScale]);

  useEffect(() => {
    autoRotateEnabledRef.current = autoRotateEnabled;
  }, [autoRotateEnabled]);

  useEffect(() => {
    if (!isGlobeReady || !globeRef.current) {
      return;
    }

    const currentView = globeRef.current.pointOfView();
    const hasFocusShift =
      lastFocusKeyRef.current !== cameraFocusKey ||
      lastCameraTargetIdRef.current !== (cameraTarget?.id ?? null);
    const focusDuration = reduceMotion
      ? 0
      : hasFocusShift
        ? cameraTarget
          ? 980
          : 620
        : 0;
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
    reduceMotion,
    zoomScale,
  ]);

  useEffect(() => {
    if (!isGlobeReady || !globeRef.current) {
      return;
    }

    if (isStageActive) {
      globeRef.current.resumeAnimation();
    } else {
      globeRef.current.pauseAnimation();
    }

    const controls = globeRef.current.controls();
    controls.enablePan = false;
    controls.enableZoom = false;
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.rotateSpeed = zoomTier === 'world' ? 0.85 : 0.65;
    controls.autoRotate =
      isStageActive && autoRotateEnabled && !isPointerOverGlobeRef.current;
    controls.autoRotateSpeed = zoomTier === 'world' ? 0.55 : 0.32;
  }, [autoRotateEnabled, isGlobeReady, isStageActive, zoomTier]);

  useEffect(() => {
    if (
      !isGlobeReady ||
      !isStageActive ||
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
  }, [isGlobeReady, isStageActive, viewport]);

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
      controls.autoRotate = isStageActive && autoRotateEnabled;
    }
    onHoverMarker(null);
  };

  const handlePointerDown = () => {
    onUserInteraction();

    const controls = globeRef.current?.controls();
    if (controls) {
      controls.autoRotate = false;
    }
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const resetPinch = () => {
      pinchGestureRef.current = null;
      isWheelZoomingRef.current = false;
    };

    const setPinchActive = (active: boolean) => {
      isPinchActiveRef.current = active;

      const controls = globeRef.current?.controls();
      if (!controls) {
        return;
      }

      controls.enabled = !active;
      controls.autoRotate =
        !active &&
        autoRotateEnabledRef.current &&
        !isPointerOverGlobeRef.current;
    };

    const syncPinch = (touches: TouchList) => {
      const distance = getTouchDistance(touches);
      if (distance <= 0) {
        return;
      }

      zoomScaleChangeRef.current((current) => {
        pinchGestureRef.current = {
          distance,
          scale: current,
        };
        return current;
      });
    };

    const stopWheelInertia = () => {
      if (wheelFrameRef.current !== null) {
        window.cancelAnimationFrame(wheelFrameRef.current);
        wheelFrameRef.current = null;
      }

      wheelMomentumRef.current = 0;
      isWheelZoomingRef.current = false;
    };

    const runWheelInertia = () => {
      const momentum = wheelMomentumRef.current;
      if (Math.abs(momentum) < 0.0025) {
        stopWheelInertia();
        return;
      }

      const currentScale = zoomScaleRef.current;
      const nextScale = clamp(
        currentScale + momentum,
        MIN_GLOBE_SCALE,
        MAX_GLOBE_SCALE,
      );
      if (nextScale === currentScale) {
        stopWheelInertia();
        return;
      }

      zoomScaleRef.current = nextScale;
      zoomScaleChangeRef.current(nextScale);

      const now = performance.now();
      const isStillScrolling = now - lastWheelEventAtRef.current < 110;

      wheelMomentumRef.current *= isStillScrolling ? 0.91 : 0.88;
      wheelFrameRef.current = window.requestAnimationFrame(runWheelInertia);
    };

    const handleWheel = (event: WheelEvent) => {
      const delta =
        event.deltaMode === WheelEvent.DOM_DELTA_LINE
          ? event.deltaY * 12
          : event.deltaY;
      if (!Number.isFinite(delta) || delta === 0) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      const nextStep = clamp(Math.abs(delta) / 360, 0.07, 0.17);
      const direction = delta > 0 ? -1 : 1;
      const immediateStep = nextStep * direction;
      const currentScale = zoomScaleRef.current;
      const nextScale = clamp(
        currentScale + immediateStep,
        MIN_GLOBE_SCALE,
        MAX_GLOBE_SCALE,
      );

      if (nextScale === currentScale) {
        stopWheelInertia();
        return;
      }

      userInteractionRef.current();

      isWheelZoomingRef.current = true;
      lastWheelEventAtRef.current = performance.now();

      zoomScaleRef.current = nextScale;
      zoomScaleChangeRef.current(nextScale);

      wheelMomentumRef.current = immediateStep * 0.28;

      if (wheelFrameRef.current !== null) {
        return;
      }

      wheelFrameRef.current = window.requestAnimationFrame(runWheelInertia);
    };

    const handleTouchStart = (event: TouchEvent) => {
      if (event.touches.length < 2) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      userInteractionRef.current();
      setPinchActive(true);
      syncPinch(event.touches);
    };

    const handleTouchMove = (event: TouchEvent) => {
      if (event.touches.length < 2) {
        return;
      }

      const pinch = pinchGestureRef.current;
      const distance = getTouchDistance(event.touches);
      if (!pinch || distance <= 0) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      isWheelZoomingRef.current = true;

      zoomScaleChangeRef.current(
        clamp(
          pinch.scale * (distance / pinch.distance),
          MIN_GLOBE_SCALE,
          MAX_GLOBE_SCALE,
        ),
      );
    };

    const handleTouchEnd = (event: TouchEvent) => {
      if (event.touches.length >= 2) {
        syncPinch(event.touches);
        return;
      }

      if (event.touches.length === 0 && isPinchActiveRef.current) {
        setPinchActive(false);
      }

      resetPinch();
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    container.addEventListener('touchstart', handleTouchStart, {
      passive: false,
    });
    container.addEventListener('touchmove', handleTouchMove, {
      passive: false,
    });
    container.addEventListener('touchend', handleTouchEnd);
    container.addEventListener('touchcancel', handleTouchEnd);

    return () => {
      container.removeEventListener('wheel', handleWheel);
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
      container.removeEventListener('touchcancel', handleTouchEnd);
      stopWheelInertia();
      setPinchActive(false);
      resetPinch();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      data-slot="atlas-globe-stage"
      className="relative mx-auto h-[min(72svh,570px)] min-h-[430px] w-full cursor-grab touch-pan-y overflow-hidden active:cursor-grabbing sm:h-[620px] lg:h-[min(68vh,700px)]"
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      onPointerDown={handlePointerDown}
      role="group"
      aria-label="Interactive globe. Drag to rotate, scroll the mouse wheel, use the zoom controls, or pinch to zoom, and select a map marker to explore photographs."
    >
      {!isGlobeReady && (
        <div
          className="absolute inset-0 z-10 grid place-items-center"
          role="status"
          aria-label="Loading atlas"
        >
          <div className="h-11 w-11 animate-spin rounded-full border-2 border-[var(--atlas-rule)] border-t-[var(--atlas-accent)] motion-reduce:animate-none" />
        </div>
      )}
      {viewport.width > 0 && viewport.height > 0 && GlobeComponent ? (
        <div className="absolute inset-0 overflow-hidden">
          <GlobeComponent
            ref={globeRef}
            width={viewport.width}
            height={viewport.height}
            backgroundColor="rgba(0,0,0,0)"
            rendererConfig={{
              antialias: true,
              alpha: true,
            }}
            globeImageUrl={surfaceTexture}
            bumpImageUrl={ATLAS_TEXTURES.elevation}
            globeMaterial={globeMaterial}
            waitForGlobeReady
            animateIn={!reduceMotion}
            showAtmosphere
            atmosphereColor={theme.atmosphere}
            atmosphereAltitude={theme.globe.atmosphereAltitude}
            enablePointerInteraction
            showPointerCursor={false}
            onGlobeReady={() => {
              applyInitialGlobeView({
                globeRef,
                initialViewAppliedRef,
                lastCameraTargetIdRef,
                lastFocusKeyRef,
                cameraTarget,
                cameraFocusKey,
                zoomScale,
              });

              const renderer = globeRef.current?.renderer();
              if (renderer) {
                const maxAnisotropy = Math.min(
                  8,
                  renderer.capabilities.getMaxAnisotropy(),
                );
                for (const texture of [
                  globeMaterial.map,
                  globeMaterial.bumpMap,
                ]) {
                  if (texture) {
                    texture.anisotropy = maxAnisotropy;
                    texture.needsUpdate = true;
                  }
                }
              }

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
              className="group overflow-visible outline-none focus-visible:ring-2 focus-visible:ring-[var(--atlas-accent)]"
              data-marker-button="true"
              data-node-id={node.id}
              data-state={isActive ? 'active' : 'idle'}
              style={{
                ...getMarkerButtonStyle({
                  x: 0.5,
                  y: 0.5,
                  visible: false,
                }),
                pointerEvents: 'none',
              }}
              onPointerDown={(event) => {
                event.stopPropagation();
              }}
              onMouseEnter={() => onHoverMarker(node.id)}
              onMouseLeave={() => onHoverMarker(null)}
              onFocus={() => onHoverMarker(node.id)}
              onBlur={() => onHoverMarker(null)}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onSelectMarker(node.id);
              }}
              aria-label={node.label}
            >
              <span
                className={cn(
                  'absolute left-1/2 top-1/2 z-10 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[var(--atlas-on-accent)] bg-[var(--atlas-accent)] shadow-[0_0_0_6px_var(--atlas-glow)] transition',
                  isActive && 'h-4 w-4 shadow-[0_0_0_10px_var(--atlas-glow)]',
                  isHovered && 'scale-125',
                )}
              />
              <span
                className={cn(
                  'absolute left-1/2 top-1/2 z-0 h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[var(--atlas-accent)] bg-[var(--atlas-glow)] opacity-0 transition duration-300',
                  (isActive || isHovered) && 'animate-pulse opacity-100',
                )}
              />
              <span
                ref={(element) => {
                  labelRefs.current[node.id] = element;
                }}
                style={{ transform: 'translate(-50%, 18px)' }}
                className={cn(
                  'absolute left-1/2 top-1/2 z-20 flex items-center gap-2 rounded-lg border border-[var(--atlas-rule)] bg-[var(--atlas-card)] px-3 py-2 text-sm font-medium text-[var(--atlas-ink)] shadow-lg shadow-[var(--atlas-shadow)] backdrop-blur-md transition',
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

export function GlobeAtlas({ posts, song }: GlobeAtlasProps) {
  const shouldReduceMotion = Boolean(useReducedMotion());
  const atlasTheme = useMemo(() => getAtlasTheme(song), [song]);
  const focusSeedPost = useMemo(
    () => posts.find((post) => post.location) ?? null,
    [posts],
  );
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
  const initialPost = focusSeedPost ?? atlasPosts[0] ?? null;
  const initialCountryId = useMemo(
    () =>
      initialPost?.location
        ? (countryNodes.find(
            (node) => node.label === initialPost.location?.country,
          )?.id ??
          countryNodes[0]?.id ??
          '')
        : (countryNodes[0]?.id ?? ''),
    [countryNodes, initialPost],
  );
  const initialLocationId = useMemo(
    () =>
      initialPost?.location
        ? (locationNodes.find(
            (node) =>
              node.label === initialPost.location?.locationName &&
              node.country === initialPost.location?.country,
          )?.id ??
          locationNodes[0]?.id ??
          '')
        : (locationNodes[0]?.id ?? ''),
    [initialPost, locationNodes],
  );
  const [zoomScale, setZoomScale] = useState(ZOOM_SCALE.world);
  const [selectedCountryId, setSelectedCountryId] = useState(initialCountryId);
  const [selectedLocationId, setSelectedLocationId] =
    useState(initialLocationId);
  const [activePostId, setActivePostId] = useState(initialPost?.id ?? '');
  const [cameraTargetId, setCameraTargetId] = useState<string | null>(
    initialCountryId || null,
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
      countryNodes.some((node) => node.id === prev) ? prev : initialCountryId,
    );
    setSelectedLocationId((prev) =>
      locationNodes.some((node) => node.id === prev) ? prev : initialLocationId,
    );
    setActivePostId((prev) =>
      atlasPosts.some((post) => post.id === prev) ? prev : atlasPosts[0].id,
    );
    setCameraTargetId((prev) =>
      prev && countryNodes.some((node) => node.id === prev)
        ? prev
        : initialCountryId,
    );
  }, [
    atlasPosts,
    countryNodes,
    initialCountryId,
    initialLocationId,
    locationNodes,
  ]);

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

  const resetAtlasView = () => {
    setSelectedCountryId(initialCountryId);
    setSelectedLocationId(initialLocationId);
    setActivePostId(initialPost?.id ?? atlasPosts[0].id);
    setCameraTargetId(initialCountryId || null);
    setCameraFocusKey((current) => current + 1);
    setDisplayZoomTier('world');
    setZoomScale(ZOOM_SCALE.world);
    setIsAutoRotateFrozen(false);
  };

  const navigateToAtlasLevel = (level: Exclude<ZoomTier, 'place'>) => {
    const targetId =
      level === 'world' ? selectedCountry.id : selectedLocation.id;

    setCameraTargetId(targetId);
    setCameraFocusKey((current) => current + 1);
    setDisplayZoomTier(level);
    setZoomScale(ZOOM_SCALE[level]);
    setIsAutoRotateFrozen(true);
  };

  return (
    <>
      <section
        id="atlas"
        data-song={song.id}
        data-theme={song.theme}
        style={atlasTheme.cssVariables}
        className="relative w-full scroll-mt-0 bg-[var(--atlas-bg)] px-4 pb-20 pt-12 text-[var(--atlas-ink)] transition-colors duration-700 sm:px-8 sm:pb-24 sm:pt-16 lg:min-h-screen lg:px-12"
        aria-labelledby="atlas-title"
      >
        <div className="relative mx-auto w-full max-w-[1240px]">
          <header className="flex items-end justify-between gap-5 border-t border-[var(--atlas-rule)] pb-7 pt-5 sm:gap-8 sm:pb-9 sm:pt-7">
            <h2
              id="atlas-title"
              className="font-serif text-[clamp(3.25rem,7vw,6.4rem)] leading-[0.88] tracking-[-0.055em]"
            >
              Places.
            </h2>
            <p
              className="pb-0.5 text-right text-[10px] font-semibold uppercase tabular-nums leading-5 tracking-[0.16em] text-[var(--atlas-muted)] sm:pb-1 sm:text-xs sm:tracking-[0.18em]"
              aria-label={`${countryNodes.length} countries, ${locationNodes.length} places`}
            >
              <span>
                {String(countryNodes.length).padStart(2, '0')} countries
              </span>
              <span
                className="mx-1.5 text-[var(--atlas-rule)]"
                aria-hidden="true"
              >
                ·
              </span>
              <span>
                {String(locationNodes.length).padStart(2, '0')} places
              </span>
            </p>
          </header>

          <div className="space-y-5">
            <motion.div
              layout={!shouldReduceMotion}
              className="relative w-full overflow-hidden rounded-[20px] border border-[var(--atlas-rule)] bg-[var(--atlas-panel)] shadow-[0_32px_90px_-58px_var(--atlas-shadow)] sm:rounded-[28px]"
            >
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 z-0 bg-[linear-gradient(to_right,var(--atlas-grid)_1px,transparent_1px),linear-gradient(to_bottom,var(--atlas-grid)_1px,transparent_1px)] bg-[size:48px_48px] opacity-45"
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 z-0 [background:radial-gradient(circle_at_50%_46%,var(--atlas-glow),transparent_54%)]"
              />
              <GlobeStage
                nodes={globeNodes}
                cameraTarget={cameraTarget}
                cameraFocusKey={cameraFocusKey}
                autoRotateEnabled={!isAutoRotateFrozen && !shouldReduceMotion}
                zoomScale={zoomScale}
                zoomTier={displayZoomTier}
                activeMarkerId={activeMarkerId}
                hoveredMarkerId={hoveredMarkerId}
                onHoverMarker={setHoveredMarkerId}
                onSelectMarker={(markerId) =>
                  handleMarkerSelection(markerId, { freezeRotation: true })
                }
                onZoomScaleChange={handleZoomScaleChange}
                onCenteredMarkerChange={handleCenteredMarkerChange}
                onUserInteraction={() => setIsAutoRotateFrozen(true)}
                theme={atlasTheme}
                reduceMotion={shouldReduceMotion}
              />

              <div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex items-start justify-between gap-3 p-3 sm:p-5">
                <nav
                  aria-label="Atlas location"
                  className="bg-[var(--atlas-card)]/90 pointer-events-auto max-w-[62%] overflow-hidden rounded-xl border border-[var(--atlas-rule)] px-1.5 shadow-lg shadow-[var(--atlas-shadow)] backdrop-blur-md sm:max-w-[70%]"
                >
                  <ol className="flex min-h-11 min-w-0 items-center text-sm font-semibold text-[var(--atlas-ink)] sm:text-base">
                    <li
                      className={cn(
                        'min-w-0',
                        displayZoomTier === 'place' && 'hidden sm:block',
                      )}
                    >
                      {displayZoomTier === 'world' ? (
                        <span
                          aria-current="page"
                          className="block truncate px-1.5 py-2 sm:px-2.5"
                        >
                          World
                        </span>
                      ) : (
                        <button
                          type="button"
                          className="block min-h-11 truncate rounded-lg px-1.5 py-2 text-[var(--atlas-muted)] outline-none transition-colors hover:text-[var(--atlas-ink)] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--atlas-accent)] sm:px-2.5"
                          onClick={() => navigateToAtlasLevel('world')}
                        >
                          World
                        </button>
                      )}
                    </li>

                    {displayZoomTier !== 'world' && (
                      <>
                        <li
                          aria-hidden="true"
                          className={cn(
                            'shrink-0 text-[var(--atlas-muted)]',
                            displayZoomTier === 'place' && 'hidden sm:block',
                          )}
                        >
                          <ChevronRight className="h-3.5 w-3.5" />
                        </li>
                        <li className="min-w-0">
                          {displayZoomTier === 'region' ? (
                            <span
                              aria-current="page"
                              className="block truncate px-1.5 py-2 sm:px-2.5"
                            >
                              {selectedCountry.label}
                            </span>
                          ) : (
                            <button
                              type="button"
                              className="block min-h-11 truncate rounded-lg px-1.5 py-2 text-[var(--atlas-muted)] outline-none transition-colors hover:text-[var(--atlas-ink)] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--atlas-accent)] sm:px-2.5"
                              onClick={() => navigateToAtlasLevel('region')}
                            >
                              {selectedCountry.label}
                            </button>
                          )}
                        </li>
                      </>
                    )}

                    {displayZoomTier === 'place' && (
                      <>
                        <li
                          aria-hidden="true"
                          className="shrink-0 text-[var(--atlas-muted)]"
                        >
                          <ChevronRight className="h-3.5 w-3.5" />
                        </li>
                        <li className="min-w-0">
                          <span
                            aria-current="page"
                            className="block truncate px-1.5 py-2 sm:px-2.5"
                          >
                            {selectedLocation.label}
                          </span>
                        </li>
                      </>
                    )}
                  </ol>
                </nav>

                <div className="bg-[var(--atlas-card)]/90 pointer-events-auto flex shrink-0 overflow-hidden rounded-xl border border-[var(--atlas-rule)] shadow-lg shadow-[var(--atlas-shadow)] backdrop-blur-md">
                  <button
                    type="button"
                    className={cn(
                      ATLAS_CONTROL_CLASSNAME,
                      'border-r border-[var(--atlas-rule)]',
                    )}
                    onClick={() => {
                      setIsAutoRotateFrozen(true);
                      handleZoomScaleChange((current) => current * 0.82);
                    }}
                    aria-label="Zoom out"
                    title="Zoom out"
                  >
                    <Minus className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    className={cn(
                      ATLAS_CONTROL_CLASSNAME,
                      'border-r border-[var(--atlas-rule)]',
                    )}
                    onClick={() => {
                      setIsAutoRotateFrozen(true);
                      handleZoomScaleChange((current) => current * 1.22);
                    }}
                    aria-label="Zoom in"
                    title="Zoom in"
                  >
                    <Plus className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    className={ATLAS_CONTROL_CLASSNAME}
                    onClick={resetAtlasView}
                    aria-label="Reset atlas view"
                    title="Reset atlas view"
                  >
                    <RotateCcw className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </div>

              <div
                aria-hidden="true"
                className="via-[var(--atlas-panel)]/70 pointer-events-none absolute inset-x-0 bottom-0 z-20 h-28 bg-gradient-to-t from-[var(--atlas-panel)] to-transparent sm:h-36"
              />
            </motion.div>

            <motion.div
              layout={!shouldReduceMotion}
              className="overflow-visible border-t border-[var(--atlas-rule)] pt-4 lg:mx-auto lg:w-full"
            >
              <div className="-mx-1 flex snap-x snap-proximity gap-3 overflow-x-auto overflow-y-visible px-1 pb-4 pt-2 [scrollbar-width:none] sm:gap-4 [&::-webkit-scrollbar]:hidden">
                {displayZoomTier === 'world' &&
                  (dockItems as CountryNode[]).map((country) => {
                    const isActive = country.id === selectedCountry.id;

                    return (
                      <AtlasDockCard
                        key={country.id}
                        active={isActive}
                        image={country.cover}
                        title={country.label}
                        meta={`${country.count} places · ${country.postCount} posts`}
                        onClick={() => {
                          handleMarkerSelection(country.id, {
                            freezeRotation: true,
                          });
                        }}
                      />
                    );
                  })}

                {displayZoomTier === 'region' &&
                  (dockItems as LocationNode[]).map((location) => {
                    const isActive = location.id === selectedLocation.id;

                    return (
                      <AtlasDockCard
                        key={location.id}
                        active={isActive}
                        image={location.cover}
                        title={location.label}
                        meta={location.region}
                        onClick={() => {
                          handleMarkerSelection(location.id, {
                            freezeRotation: true,
                          });
                        }}
                      />
                    );
                  })}

                {displayZoomTier === 'place' &&
                  (dockItems as CityPost[]).map((post) => {
                    const isActive = post.id === activePost.id;

                    return (
                      <AtlasDockCard
                        key={post.id}
                        active={isActive}
                        image={post.cover}
                        title={post.city}
                        meta={post.location?.region ?? selectedLocation.region}
                        onClick={(element) => {
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
                          openViewer(post.id, element);
                        }}
                      />
                    );
                  })}
              </div>
            </motion.div>
          </div>
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

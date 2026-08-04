'use client';

import {
  type CSSProperties,
  type MutableRefObject,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { useTranslations } from 'next-intl';
import type { GlobeMethods } from 'react-globe.gl';
import { MeshLambertMaterial } from 'three';

import {
  getGlobeView,
  getMarkerLabelTransform,
  globeScaleToAltitude,
  isNodeVisibleFromView,
} from '@/features/atlas/model/globe-view';
import {
  COUNTRY_ENTRY_SCALE,
  MAX_GLOBE_SCALE,
  MIN_GLOBE_SCALE,
  clamp,
  getCenteredNodeId,
  type MarkerNode,
  type ZoomTier,
} from '@/features/atlas/model/atlas';
import { cn } from '@/lib/utils';

import { type GlobeComponentType, loadGlobeComponent } from './globe-runtime';
import {
  ATLAS_TEXTURES,
  type AtlasTheme,
  getAtlasSurfaceTexture,
} from './theme';

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

function getMarkerButtonStyle(position: {
  x: number;
  y: number;
  visible: boolean;
}): CSSProperties {
  return {
    position: 'absolute',
    left: `${position.x * 100}%`,
    top: `${position.y * 100}%`,
    width: '2.75rem',
    height: '2.75rem',
    opacity: position.visible ? 1 : 0,
    transform: `translate(-50%, -50%) scale(${position.visible ? 1 : 0.85})`,
    transition: 'opacity 220ms ease, transform 220ms ease',
  };
}

export interface GlobeStageProps {
  nodes: MarkerNode[];
  cameraTarget: MarkerNode | null;
  cameraFocusKey: number;
  autoRotateEnabled: boolean;
  isInteractionActive: boolean;
  zoomScale: number;
  zoomTier: ZoomTier;
  activeMarkerId: string | null;
  hoveredMarkerId: string | null;
  onHoverMarker: (id: string | null) => void;
  onSelectMarker: (id: string) => void;
  onZoomScaleChange: (value: number | ((prev: number) => number)) => void;
  onZoomIntoMarker: (id: string) => void;
  onCenteredMarkerChange: (id: string | null) => void;
  onUserInteraction: () => void;
  theme: AtlasTheme;
  reduceMotion: boolean;
}

export function GlobeStage({
  nodes,
  cameraTarget,
  cameraFocusKey,
  autoRotateEnabled,
  isInteractionActive,
  zoomScale,
  zoomTier,
  activeMarkerId,
  hoveredMarkerId,
  onHoverMarker,
  onSelectMarker,
  onZoomScaleChange,
  onZoomIntoMarker,
  onCenteredMarkerChange,
  onUserInteraction,
  theme,
  reduceMotion,
}: GlobeStageProps) {
  const t = useTranslations('Atlas');
  const containerRef = useRef<HTMLDivElement>(null);
  const globeRef = useRef<GlobeMethods | undefined>(undefined);
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
  const lastZoomScaleRef = useRef(zoomScale);
  const zoomScaleChangeRef = useRef(onZoomScaleChange);
  const zoomIntoMarkerRef = useRef(onZoomIntoMarker);
  const zoomScaleRef = useRef(zoomScale);
  const pendingWheelZoomRef = useRef(0);
  const wheelFrameRef = useRef<number | null>(null);
  const wheelIdleTimerRef = useRef<number | null>(null);
  const isWheelZoomingRef = useRef(false);
  const focusTransitionUntilRef = useRef(0);
  const focusTransitionTimerRef = useRef<number | null>(null);
  const initialViewAppliedRef = useRef(false);
  const pinchGestureRef = useRef<{
    distance: number;
    scale: number;
  } | null>(null);
  const hasRequestedCountryEntryRef = useRef(false);
  const autoRotateEnabledRef = useRef(autoRotateEnabled);
  const isInteractionActiveRef = useRef(isInteractionActive);
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
  const surfaceTexture = getAtlasSurfaceTexture(
    theme,
    viewport.width,
    typeof window === 'undefined' ? 1 : window.devicePixelRatio,
  );

  useEffect(() => {
    return () => {
      globeMaterial.dispose();
    };
  }, [globeMaterial]);

  useEffect(() => {
    let isCancelled = false;

    void loadGlobeComponent().then((component) => {
      if (!isCancelled) {
        setGlobeComponent(() => component);
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
    zoomIntoMarkerRef.current = onZoomIntoMarker;
  }, [onZoomIntoMarker]);

  useEffect(() => {
    zoomScaleRef.current = zoomScale;
    if (zoomScale < COUNTRY_ENTRY_SCALE) {
      hasRequestedCountryEntryRef.current = false;
    }
  }, [zoomScale]);

  useEffect(() => {
    autoRotateEnabledRef.current = autoRotateEnabled;
  }, [autoRotateEnabled]);

  useEffect(() => {
    isInteractionActiveRef.current = isInteractionActive;
  }, [isInteractionActive]);

  useEffect(() => {
    if (!isGlobeReady || !globeRef.current) {
      return;
    }

    const currentView = globeRef.current.pointOfView();
    const hasFocusShift =
      lastFocusKeyRef.current !== cameraFocusKey ||
      lastCameraTargetIdRef.current !== (cameraTarget?.id ?? null);
    const hasZoomShift = lastZoomScaleRef.current !== zoomScale;

    if (!hasFocusShift && !hasZoomShift) {
      return;
    }

    const focusDuration = reduceMotion
      ? 0
      : hasFocusShift
        ? cameraTarget
          ? 420
          : 520
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
          isInteractionActiveRef.current &&
          autoRotateEnabledRef.current &&
          !isPointerOverGlobeRef.current;
      }, focusDuration + 40);
    }

    lastFocusKeyRef.current = cameraFocusKey;
    lastCameraTargetIdRef.current = cameraTarget?.id ?? null;
    lastZoomScaleRef.current = zoomScale;
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

    const shouldAnimateStage = isStageActive && isInteractionActive;

    if (shouldAnimateStage) {
      globeRef.current.resumeAnimation();
    } else {
      globeRef.current.pauseAnimation();
    }

    const controls = globeRef.current.controls();
    controls.enablePan = false;
    controls.enableZoom = false;
    controls.enableDamping = false;
    controls.rotateSpeed = zoomTier === 'world' ? 0.78 : 0.65;
    controls.autoRotate =
      shouldAnimateStage &&
      autoRotateEnabled &&
      !isPointerOverGlobeRef.current &&
      performance.now() >= focusTransitionUntilRef.current;
    controls.autoRotateSpeed = zoomTier === 'world' ? 0.3 : 0.22;
  }, [
    autoRotateEnabled,
    isGlobeReady,
    isInteractionActive,
    isStageActive,
    zoomTier,
  ]);

  useEffect(() => {
    if (
      !isGlobeReady ||
      !isStageActive ||
      !isInteractionActive ||
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
  }, [isGlobeReady, isInteractionActive, isStageActive, viewport]);

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
      controls.autoRotate =
        isStageActive &&
        isInteractionActive &&
        autoRotateEnabled &&
        performance.now() >= focusTransitionUntilRef.current;
    }
    onHoverMarker(null);
  };

  const handlePointerDown = () => {
    onUserInteraction();

    const globe = globeRef.current;
    if (globe) {
      const currentView = globe.pointOfView();
      globe.pointOfView(currentView, 0);
    }

    focusTransitionUntilRef.current = 0;
    if (focusTransitionTimerRef.current !== null) {
      window.clearTimeout(focusTransitionTimerRef.current);
      focusTransitionTimerRef.current = null;
    }

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
        isInteractionActiveRef.current &&
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

    const stopWheelInput = () => {
      if (wheelFrameRef.current !== null) {
        window.cancelAnimationFrame(wheelFrameRef.current);
        wheelFrameRef.current = null;
      }

      if (wheelIdleTimerRef.current !== null) {
        window.clearTimeout(wheelIdleTimerRef.current);
        wheelIdleTimerRef.current = null;
      }

      pendingWheelZoomRef.current = 0;
      isWheelZoomingRef.current = false;
    };

    const getCountryEntryMarker = (nextScale: number) => {
      if (
        nextScale < COUNTRY_ENTRY_SCALE ||
        hasRequestedCountryEntryRef.current
      ) {
        return null;
      }

      const markerId = centeredMarkerIdRef.current ?? activeMarkerIdRef.current;
      if (!markerId) {
        return null;
      }

      hasRequestedCountryEntryRef.current = true;
      return markerId;
    };

    const scheduleWheelIdle = () => {
      if (wheelIdleTimerRef.current !== null) {
        window.clearTimeout(wheelIdleTimerRef.current);
      }
      wheelIdleTimerRef.current = window.setTimeout(() => {
        isWheelZoomingRef.current = false;
        wheelIdleTimerRef.current = null;
      }, 90);
    };

    const applyWheelZoom = () => {
      wheelFrameRef.current = null;

      if (!isInteractionActiveRef.current) {
        stopWheelInput();
        return;
      }

      const wheelZoom = clamp(pendingWheelZoomRef.current, -0.2, 0.2);
      pendingWheelZoomRef.current = 0;

      if (wheelZoom === 0) {
        scheduleWheelIdle();
        return;
      }

      const currentScale = zoomScaleRef.current;
      const nextScale = clamp(
        currentScale + wheelZoom,
        MIN_GLOBE_SCALE,
        MAX_GLOBE_SCALE,
      );
      if (nextScale === currentScale) {
        scheduleWheelIdle();
        return;
      }

      const globe = globeRef.current;
      if (globe) {
        const view = globe.pointOfView();
        globe.pointOfView(
          {
            lat: view.lat,
            lng: view.lng,
            altitude: globeScaleToAltitude(nextScale),
          },
          0,
        );
      }

      zoomScaleRef.current = nextScale;
      zoomScaleChangeRef.current(nextScale);

      const entryMarkerId = getCountryEntryMarker(nextScale);
      if (entryMarkerId) {
        stopWheelInput();
        zoomIntoMarkerRef.current(entryMarkerId);
        return;
      }

      scheduleWheelIdle();
    };

    const handleWheel = (event: WheelEvent) => {
      if (!isInteractionActiveRef.current) {
        event.preventDefault();
        event.stopPropagation();
        stopWheelInput();
        return;
      }

      const delta =
        event.deltaMode === WheelEvent.DOM_DELTA_LINE
          ? event.deltaY * 12
          : event.deltaY;
      if (!Number.isFinite(delta) || delta === 0) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      userInteractionRef.current();

      isWheelZoomingRef.current = true;
      if (wheelIdleTimerRef.current !== null) {
        window.clearTimeout(wheelIdleTimerRef.current);
        wheelIdleTimerRef.current = null;
      }
      pendingWheelZoomRef.current += -delta * (event.ctrlKey ? 0.0048 : 0.0016);

      if (wheelFrameRef.current !== null) {
        return;
      }

      wheelFrameRef.current = window.requestAnimationFrame(applyWheelZoom);
    };

    const handleTouchStart = (event: TouchEvent) => {
      if (!isInteractionActiveRef.current) {
        if (event.touches.length >= 2) {
          event.preventDefault();
          event.stopPropagation();
        }
        return;
      }

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

      const nextScale = clamp(
        pinch.scale * (distance / pinch.distance),
        MIN_GLOBE_SCALE,
        MAX_GLOBE_SCALE,
      );
      zoomScaleRef.current = nextScale;
      zoomScaleChangeRef.current(nextScale);

      const entryMarkerId = getCountryEntryMarker(nextScale);
      if (entryMarkerId) {
        zoomIntoMarkerRef.current(entryMarkerId);
      }
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
      stopWheelInput();
      setPinchActive(false);
      resetPinch();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      data-slot="atlas-globe-stage"
      className="relative h-full min-h-0 w-full cursor-grab touch-pan-y overflow-hidden active:cursor-grabbing"
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      onPointerDown={handlePointerDown}
      role="group"
      aria-label={t('interactiveGlobe')}
    >
      {!isGlobeReady && (
        <div
          className="absolute inset-0 z-10 grid place-items-center"
          role="status"
          aria-label={t('loadingLabel')}
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
            animateIn={false}
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
              lastZoomScaleRef.current = zoomScale;

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

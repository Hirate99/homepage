'use client';

import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ChevronRight, Minus, Plus, RotateCcw } from 'lucide-react';
import { useTranslations } from 'next-intl';

import type { CardRect } from '@/components/home/images';
import type { CityPost } from '@/features/collections/model/city-post';
import {
  COUNTRY_ENTRY_SCALE,
  MAX_GLOBE_SCALE,
  MIN_GLOBE_SCALE,
  ZOOM_SCALE,
  buildCountryNodes,
  buildLocationNodes,
  clamp,
  sortPosts,
  type CountryNode,
  type LocationNode,
  type MarkerNode,
  type ZoomTier,
} from '@/features/atlas/model/atlas';
import { cn } from '@/lib/utils';
import { useSongStore } from '@/providers/song-store-provider';

import { AtlasBrowser, type AtlasBrowserItem } from './atlas-browser';
import { CountryMapStage } from './country-map-stage';
import { GlobeStage } from './globe-stage';
import { getAtlasTheme } from './theme';

interface GlobeAtlasProps {
  posts: CityPost[];
}

const ATLAS_CONTROL_CLASSNAME =
  'grid h-11 w-11 touch-manipulation place-items-center text-[var(--atlas-ink)] outline-none transition-colors hover:bg-[var(--atlas-accent)] hover:text-[var(--atlas-on-accent)] focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-[var(--atlas-accent)] focus-visible:ring-inset';

let expandedPostModulePromise: Promise<
  typeof import('@/components/home/images')
> | null = null;

function loadExpandedPostModule() {
  expandedPostModulePromise ??= import('@/components/home/images').catch(
    (error: unknown) => {
      expandedPostModulePromise = null;
      throw error;
    },
  );

  return expandedPostModulePromise;
}

const ExpandedPost = lazy(() =>
  loadExpandedPostModule().then((module) => ({
    default: module.ExpandedPost,
  })),
);

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

export function GlobeAtlas({ posts }: GlobeAtlasProps) {
  const t = useTranslations('Atlas');
  const song = useSongStore((state) => state.song);
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
        ? (locationNodes.find((node) =>
            node.posts.some((post) => post.id === initialPost.id),
          )?.id ??
          locationNodes[0]?.id ??
          '')
        : (locationNodes[0]?.id ?? ''),
    [initialPost, locationNodes],
  );
  const [zoomScale, setZoomScale] = useState<number>(ZOOM_SCALE.world);
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
  const [displayZoomTier, setDisplayZoomTier] = useState<ZoomTier>(
    () => 'world',
  );
  const [isLevelTransitioning, setIsLevelTransitioning] = useState(false);
  const [transitionDirection, setTransitionDirection] = useState<
    'enter' | 'exit' | null
  >(null);
  const atlasViewportRef = useRef<HTMLDivElement>(null);
  const transitionTimersRef = useRef<number[]>([]);

  useEffect(() => {
    return () => {
      for (const timerId of transitionTimersRef.current) {
        window.clearTimeout(timerId);
      }
    };
  }, []);

  useEffect(() => {
    const viewport = atlasViewportRef.current;
    if (!viewport) {
      return;
    }

    const keepWheelInsideAtlas = (event: WheelEvent) => {
      if (isLevelTransitioning || displayZoomTier !== 'world') {
        event.preventDefault();
      }
    };

    viewport.addEventListener('wheel', keepWheelInsideAtlas, {
      passive: false,
    });

    return () => {
      viewport.removeEventListener('wheel', keepWheelInsideAtlas);
    };
  }, [displayZoomTier, isLevelTransitioning]);

  useEffect(() => {
    if (displayZoomTier === 'place') {
      void loadExpandedPostModule().catch(() => undefined);
    }
  }, [displayZoomTier]);

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

    return selectedLocation?.id ?? null;
  }, [displayZoomTier, selectedCountry, selectedLocation]);

  const cameraTarget = useMemo<MarkerNode | null>(() => {
    if (!cameraTargetId) {
      return null;
    }

    return countryNodes.find((node) => node.id === cameraTargetId) ?? null;
  }, [cameraTargetId, countryNodes]);

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
    void loadExpandedPostModule().catch(() => undefined);
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

  const clearTransitionTimers = () => {
    for (const timerId of transitionTimersRef.current) {
      window.clearTimeout(timerId);
    }
    transitionTimersRef.current = [];
  };

  const scheduleTransitionStep = (callback: () => void, delay: number) => {
    const timerId = window.setTimeout(callback, delay);
    transitionTimersRef.current.push(timerId);
  };

  const enterCountry = (country: CountryNode) => {
    clearTransitionTimers();
    setSelectedCountryId(country.id);
    setSelectedLocationId(country.locations[0]?.id ?? selectedLocation.id);
    setActivePostId(country.locations[0]?.posts[0]?.id ?? activePost.id);
    focusCamera(country.id, { freezeRotation: true });

    if (shouldReduceMotion) {
      setZoomScale(ZOOM_SCALE.region);
      setDisplayZoomTier('region');
      setIsLevelTransitioning(false);
      setTransitionDirection(null);
      return;
    }

    setIsLevelTransitioning(true);
    setTransitionDirection('enter');
    scheduleTransitionStep(() => {
      setDisplayZoomTier('region');
    }, 120);
    scheduleTransitionStep(() => {
      setZoomScale(ZOOM_SCALE.region);
      setIsLevelTransitioning(false);
      setTransitionDirection(null);
    }, 540);
  };

  const returnToWorld = (resetSelection = false) => {
    clearTransitionTimers();
    const targetCountry = resetSelection
      ? (countryNodes.find((country) => country.id === initialCountryId) ??
        selectedCountry)
      : selectedCountry;

    if (resetSelection) {
      setSelectedCountryId(targetCountry.id);
      setSelectedLocationId(
        targetCountry.locations[0]?.id ?? initialLocationId,
      );
      setActivePostId(
        targetCountry.locations[0]?.posts[0]?.id ??
          initialPost?.id ??
          atlasPosts[0].id,
      );
    }

    setCameraTargetId(targetCountry.id);
    setCameraFocusKey((current) => current + 1);
    setIsAutoRotateFrozen(true);
    setZoomScale(ZOOM_SCALE.region);

    if (shouldReduceMotion) {
      setDisplayZoomTier('world');
      setZoomScale(ZOOM_SCALE.world);
      setCameraTargetId(resetSelection ? initialCountryId : targetCountry.id);
      setIsAutoRotateFrozen(false);
      setIsLevelTransitioning(false);
      setTransitionDirection(null);
      return;
    }

    setIsLevelTransitioning(true);
    setTransitionDirection('exit');
    setDisplayZoomTier('world');
    scheduleTransitionStep(() => {
      setZoomScale(ZOOM_SCALE.world);
      setCameraTargetId(null);
      setCameraFocusKey((current) => current + 1);
    }, 40);
    scheduleTransitionStep(() => {
      setIsLevelTransitioning(false);
      setTransitionDirection(null);
    }, 580);
    scheduleTransitionStep(() => {
      setIsAutoRotateFrozen(false);
    }, 760);
  };

  const handleCountrySelection = (markerId: string) => {
    const countryNode = countryNodes.find((node) => node.id === markerId);
    if (!countryNode) {
      return;
    }

    enterCountry(countryNode);
  };

  const handleZoomIntoCountry = (markerId: string) => {
    if (displayZoomTier !== 'world' || isLevelTransitioning) {
      return;
    }

    const countryNode =
      countryNodes.find((node) => node.id === markerId) ?? selectedCountry;
    enterCountry(countryNode);
  };

  const handleWorldZoomIn = () => {
    const nextScale = clamp(zoomScale * 1.22, MIN_GLOBE_SCALE, MAX_GLOBE_SCALE);

    if (nextScale >= COUNTRY_ENTRY_SCALE) {
      handleZoomIntoCountry(selectedCountry.id);
      return;
    }

    setIsAutoRotateFrozen(true);
    setZoomScale(nextScale);
  };

  const handleCenteredMarkerChange = (markerId: string | null) => {
    if (!markerId || !isAutoRotateFrozen) {
      return;
    }

    const countryNode = countryNodes.find((node) => node.id === markerId);
    if (!countryNode) {
      return;
    }

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
  };

  const resetAtlasView = () => {
    if (displayZoomTier === 'world') {
      clearTransitionTimers();
      setSelectedCountryId(initialCountryId);
      setSelectedLocationId(initialLocationId);
      setActivePostId(initialPost?.id ?? atlasPosts[0].id);
      setCameraTargetId(null);
      setCameraFocusKey((current) => current + 1);
      setZoomScale(ZOOM_SCALE.world);
      setIsAutoRotateFrozen(false);
      setIsLevelTransitioning(false);
      setTransitionDirection(null);
      return;
    }

    returnToWorld(true);
  };

  const navigateToAtlasLevel = (level: Exclude<ZoomTier, 'place'>) => {
    if (level === 'world') {
      returnToWorld();
      return;
    }

    setDisplayZoomTier('region');
  };

  const handlePostSelection = (post: CityPost, element?: HTMLElement) => {
    const parentLocationId =
      locationNodes.find((node) =>
        node.posts.some((locationPost) => locationPost.id === post.id),
      )?.id ?? null;
    const parentCountryId =
      countryNodes.find((node) => node.label === post.location?.country)?.id ??
      null;

    if (parentCountryId) {
      setSelectedCountryId(parentCountryId);
    }
    if (parentLocationId) {
      setSelectedLocationId(parentLocationId);
    }
    setActivePostId(post.id);
    setIsAutoRotateFrozen(true);
    openViewer(post.id, element);
  };

  const handleLocationSelection = (
    markerId: string,
    element?: HTMLButtonElement,
  ) => {
    const locationNode = locationNodes.find((node) => node.id === markerId);
    if (!locationNode) {
      return;
    }

    setIsAutoRotateFrozen(true);
    setSelectedCountryId(
      countryNodes.find((node) => node.label === locationNode.country)?.id ??
        selectedCountry.id,
    );
    setSelectedLocationId(locationNode.id);
    setActivePostId(locationNode.posts[0]?.id ?? activePost.id);

    if (locationNode.posts.length === 1) {
      handlePostSelection(locationNode.posts[0], element);
      return;
    }

    setDisplayZoomTier('place');
  };

  const browserItems: AtlasBrowserItem[] =
    displayZoomTier === 'world'
      ? countryNodes.map((country) => ({
          id: country.id,
          active: country.id === selectedCountry.id,
          image: country.cover,
          title: country.label,
          meta: t('dockMeta', {
            placeCount: country.count,
            postCount: country.postCount,
          }),
          onSelect: () => handleCountrySelection(country.id),
        }))
      : displayZoomTier === 'region'
        ? regionNodes.map((location) => ({
            id: location.id,
            active: location.id === selectedLocation.id,
            image: location.cover,
            title: location.label,
            meta: location.region,
            onSelect: (element) =>
              handleLocationSelection(location.id, element),
          }))
        : selectedLocation.posts.map((post) => ({
            id: post.id,
            active: post.id === activePost.id,
            image: post.cover,
            title: post.city,
            meta: post.location?.region ?? selectedLocation.region,
            onSelect: (element) => handlePostSelection(post, element),
          }));

  const browserTitle =
    displayZoomTier === 'world'
      ? t('browseCountries')
      : displayZoomTier === 'region'
        ? t('browseCountryPlaces', { country: selectedCountry.label })
        : t('browsePlacePosts', { place: selectedLocation.label });
  const browserSearchPlaceholder =
    displayZoomTier === 'world'
      ? t('searchCountries')
      : displayZoomTier === 'region'
        ? t('searchCountryPlaces', { country: selectedCountry.label })
        : t('searchPlacePosts', { place: selectedLocation.label });
  const showWorldLayer = displayZoomTier === 'world' || isLevelTransitioning;
  const showCountryLayer = displayZoomTier !== 'world' || isLevelTransitioning;

  return (
    <>
      <section
        id="atlas"
        data-song={song.id}
        data-theme={song.theme}
        style={atlasTheme.cssVariables}
        className="relative w-full scroll-mt-0 overflow-x-hidden bg-[var(--atlas-bg)] pb-20 pt-12 text-[var(--atlas-ink)] transition-colors duration-700 sm:px-8 sm:pb-24 sm:pt-16 lg:min-h-screen lg:px-12"
        aria-labelledby="atlas-title"
      >
        <div className="relative mx-auto w-full max-w-[1280px]">
          <header className="mx-4 flex items-end justify-between gap-5 border-t border-[var(--atlas-rule)] pb-7 pt-5 sm:mx-0 sm:gap-8 sm:pb-9 sm:pt-7">
            <h2
              id="atlas-title"
              className="font-serif text-[clamp(3.25rem,7vw,6.4rem)] leading-[0.88] tracking-[-0.055em]"
            >
              {t('title')}
            </h2>
            <p
              className="pb-0.5 text-right text-[10px] font-semibold uppercase tabular-nums leading-5 tracking-[0.16em] text-[var(--atlas-muted)] sm:pb-1 sm:text-xs sm:tracking-[0.18em]"
              aria-label={t('summary', {
                countryCount: countryNodes.length,
                placeCount: locationNodes.length,
              })}
            >
              <span>
                {String(countryNodes.length).padStart(2, '0')}{' '}
                {t('countries', { count: countryNodes.length })}
              </span>
              <span
                className="mx-1.5 text-[var(--atlas-rule)]"
                aria-hidden="true"
              >
                ·
              </span>
              <span>
                {String(locationNodes.length).padStart(2, '0')}{' '}
                {t('places', { count: locationNodes.length })}
              </span>
            </p>
          </header>

          <div className="grid min-w-0 overflow-hidden border-y border-[var(--atlas-rule)] bg-[var(--atlas-panel)] sm:rounded-[24px] sm:border lg:h-[min(74svh,720px)] lg:min-h-[600px] lg:grid-cols-[minmax(0,1fr)_352px]">
            <div
              ref={atlasViewportRef}
              className="relative isolate h-[min(54svh,520px)] min-h-[360px] min-w-0 overflow-hidden lg:h-full"
            >
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 z-0 bg-[linear-gradient(to_right,var(--atlas-grid)_1px,transparent_1px),linear-gradient(to_bottom,var(--atlas-grid)_1px,transparent_1px)] bg-[size:48px_48px] opacity-45"
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 z-0 [background:radial-gradient(circle_at_50%_46%,var(--atlas-glow),transparent_54%)]"
              />

              <AnimatePresence initial={false}>
                {showWorldLayer && (
                  <motion.div
                    key="atlas-world-layer"
                    initial={
                      transitionDirection === 'exit'
                        ? {
                            opacity: 0,
                            scale: 0.985,
                          }
                        : { opacity: 1, scale: 1 }
                    }
                    animate={
                      displayZoomTier === 'world'
                        ? {
                            opacity: 1,
                            scale: 1,
                          }
                        : {
                            opacity: 0,
                            scale: 1.025,
                          }
                    }
                    exit={{
                      opacity: 0,
                      scale: 1.025,
                    }}
                    transition={{
                      duration: shouldReduceMotion ? 0 : 0.38,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                    className={cn(
                      'absolute inset-0 z-10 origin-center will-change-[opacity,transform]',
                      (displayZoomTier !== 'world' || isLevelTransitioning) &&
                        'pointer-events-none',
                    )}
                  >
                    <GlobeStage
                      nodes={countryNodes}
                      cameraTarget={cameraTarget}
                      cameraFocusKey={cameraFocusKey}
                      autoRotateEnabled={
                        !isAutoRotateFrozen && !shouldReduceMotion
                      }
                      isInteractionActive={
                        displayZoomTier === 'world' &&
                        transitionDirection !== 'enter'
                      }
                      zoomScale={zoomScale}
                      zoomTier="world"
                      activeMarkerId={
                        displayZoomTier === 'world' ? activeMarkerId : null
                      }
                      hoveredMarkerId={hoveredMarkerId}
                      onHoverMarker={setHoveredMarkerId}
                      onSelectMarker={handleCountrySelection}
                      onZoomScaleChange={handleZoomScaleChange}
                      onZoomIntoMarker={handleZoomIntoCountry}
                      onCenteredMarkerChange={handleCenteredMarkerChange}
                      onUserInteraction={() => setIsAutoRotateFrozen(true)}
                      theme={atlasTheme}
                      reduceMotion={shouldReduceMotion}
                    />
                  </motion.div>
                )}

                {showCountryLayer && (
                  <motion.div
                    key={`atlas-country-layer-${selectedCountry.id}`}
                    initial={{
                      opacity: 0,
                      scale: 0.985,
                    }}
                    animate={
                      displayZoomTier === 'world'
                        ? {
                            opacity: 0,
                            scale: 0.985,
                          }
                        : {
                            opacity: 1,
                            scale: 1,
                          }
                    }
                    exit={{
                      opacity: 0,
                      scale: 0.985,
                    }}
                    transition={{
                      duration: shouldReduceMotion ? 0 : 0.38,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                    className={cn(
                      'absolute inset-0 z-20 origin-center will-change-[opacity,transform]',
                      (displayZoomTier === 'world' || isLevelTransitioning) &&
                        'pointer-events-none',
                    )}
                  >
                    <CountryMapStage
                      country={selectedCountry}
                      level={displayZoomTier === 'place' ? 'place' : 'region'}
                      nodes={regionNodes}
                      activeMarkerId={
                        displayZoomTier === 'world' ? null : activeMarkerId
                      }
                      onHoverMarker={setHoveredMarkerId}
                      onSelectMarker={handleLocationSelection}
                      onExitToWorld={() => returnToWorld()}
                      reduceMotion={shouldReduceMotion}
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="bg-[var(--atlas-panel)]/88 pointer-events-none absolute inset-x-0 top-0 z-40 flex min-h-14 items-center justify-between gap-2 border-b border-[var(--atlas-rule)] px-3 py-1.5 backdrop-blur-md sm:px-4">
                <nav
                  aria-label={t('locationNavigation')}
                  className="pointer-events-auto max-w-[70%] overflow-hidden sm:max-w-[76%]"
                >
                  <ol className="flex min-h-11 min-w-0 items-center text-xs font-semibold uppercase tracking-[0.1em] text-[var(--atlas-ink)] sm:text-sm">
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
                          {t('world')}
                        </span>
                      ) : (
                        <button
                          type="button"
                          className="block min-h-11 truncate rounded-lg px-1.5 py-2 text-[var(--atlas-muted)] outline-none transition-colors hover:text-[var(--atlas-ink)] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--atlas-accent)] sm:px-2.5"
                          onClick={() => navigateToAtlasLevel('world')}
                          disabled={isLevelTransitioning}
                        >
                          {t('world')}
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

                <div className="pointer-events-auto flex shrink-0 overflow-hidden border-l border-[var(--atlas-rule)]">
                  {displayZoomTier === 'world' && (
                    <>
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
                        aria-label={t('zoomOut')}
                        title={t('zoomOut')}
                        disabled={isLevelTransitioning}
                      >
                        <Minus className="h-4 w-4" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        className={cn(
                          ATLAS_CONTROL_CLASSNAME,
                          'border-r border-[var(--atlas-rule)]',
                        )}
                        onClick={handleWorldZoomIn}
                        aria-label={t('zoomIn')}
                        title={t('zoomIn')}
                        disabled={isLevelTransitioning}
                      >
                        <Plus className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    className={ATLAS_CONTROL_CLASSNAME}
                    onClick={resetAtlasView}
                    aria-label={t('resetView')}
                    title={t('resetView')}
                    disabled={isLevelTransitioning}
                  >
                    <RotateCcw className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </div>

              {displayZoomTier === 'world' && (
                <div
                  aria-hidden="true"
                  className="via-[var(--atlas-panel)]/70 pointer-events-none absolute inset-x-0 bottom-0 z-30 h-28 bg-gradient-to-t from-[var(--atlas-panel)] to-transparent sm:h-36"
                />
              )}

              {isLevelTransitioning && (
                <span className="sr-only" role="status">
                  {transitionDirection === 'enter'
                    ? t('enteringCountry', {
                        country: selectedCountry.label,
                      })
                    : t('returningToWorld')}
                </span>
              )}
            </div>

            <AtlasBrowser
              title={browserTitle}
              items={browserItems}
              scopeKey={`${displayZoomTier}:${selectedCountry.id}:${selectedLocation.id}`}
              searchLabel={t('searchLabel')}
              searchPlaceholder={browserSearchPlaceholder}
              resultLabel={(count) => t('resultCount', { count })}
              emptyLabel={t('noResults')}
            />
          </div>
        </div>
      </section>

      <Suspense fallback={null}>
        <AnimatePresence mode="wait">
          {viewerPost && viewerState && (
            <ExpandedPost
              post={viewerPost}
              originRect={viewerState.originRect}
              onClose={() => setViewerState(null)}
            />
          )}
        </AnimatePresence>
      </Suspense>
    </>
  );
}

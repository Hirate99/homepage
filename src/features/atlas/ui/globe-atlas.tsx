'use client';

import {
  Suspense,
  lazy,
  useEffect,
  useMemo,
  useReducer,
  useState,
} from 'react';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ChevronRight, Minus, Plus, RotateCcw } from 'lucide-react';
import { useTranslations } from 'next-intl';

import type { CardRect } from '@/components/home/images';
import { type CityPost } from '@/features/collections/model/city-post';
import {
  atlasNavigationReducer,
  createAtlasNavigationState,
} from '@/features/atlas/model/navigation';
import {
  ZOOM_SCALE,
  buildAllPostNodes,
  buildCountryNodes,
  buildLocationNodes,
  getZoomTier,
  sortPosts,
  type CountryNode,
  type LocationNode,
  type MarkerNode,
  type PostNode,
  type ZoomTier,
} from '@/features/atlas/model/atlas';
import { cn } from '@/lib/utils';
import { useSongStore } from '@/providers/song-store-provider';

import { AtlasDockCard } from './atlas-dock-card';
import { GlobeStage } from './globe-stage';
import { getAtlasTheme } from './theme';

interface GlobeAtlasProps {
  posts: CityPost[];
}

const ATLAS_CONTROL_CLASSNAME =
  'grid h-11 w-11 place-items-center text-[var(--atlas-ink)] outline-none transition-colors hover:bg-[var(--atlas-accent)] hover:text-[var(--atlas-on-accent)] focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-[var(--atlas-accent)] focus-visible:ring-inset';

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
  const [navigation, dispatchNavigation] = useReducer(
    atlasNavigationReducer,
    {
      countryId: initialCountryId,
      locationId: initialLocationId,
      postId: initialPost?.id ?? '',
    },
    createAtlasNavigationState,
  );
  const {
    zoomScale,
    selectedCountryId,
    selectedLocationId,
    activePostId,
    cameraTargetId,
    cameraFocusKey,
    isAutoRotateFrozen,
    displayZoomTier,
  } = navigation;
  const [hoveredMarkerId, setHoveredMarkerId] = useState<string | null>(null);
  const [viewerState, setViewerState] = useState<{
    id: string;
    originRect: CardRect;
  } | null>(null);
  const zoomTier = getZoomTier(zoomScale);

  useEffect(() => {
    if (zoomTier === displayZoomTier) {
      return;
    }

    const timerId = window.setTimeout(() => {
      dispatchNavigation({
        type: 'set_display_tier',
        tier: zoomTier,
      });
    }, 150);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [displayZoomTier, zoomTier]);

  useEffect(() => {
    if (displayZoomTier === 'place') {
      void loadExpandedPostModule().catch(() => undefined);
    }
  }, [displayZoomTier]);

  useEffect(() => {
    if (!countryNodes.length || !locationNodes.length || !atlasPosts.length) {
      return;
    }

    dispatchNavigation({
      type: 'sync',
      countryIds: countryNodes.map((node) => node.id),
      locationIds: locationNodes.map((node) => node.id),
      postIds: atlasPosts.map((post) => post.id),
      fallback: {
        countryId: initialCountryId,
        locationId: initialLocationId,
        postId: atlasPosts[0].id,
      },
    });
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

    dispatchNavigation({
      type: 'center_selection',
      countryId: parentCountryId,
    });
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
    dispatchNavigation({
      type: 'set_zoom',
      value,
    });
  };

  const handleMarkerSelection = (
    markerId: string,
    options?: { freezeRotation?: boolean },
  ) => {
    const countryNode = countryNodes.find((node) => node.id === markerId);
    if (countryNode) {
      dispatchNavigation({
        type: 'select_country',
        countryId: countryNode.id,
        locationId: countryNode.locations[0]?.id ?? selectedLocation.id,
        postId: countryNode.locations[0]?.posts[0]?.id ?? activePost.id,
        freezeRotation: Boolean(options?.freezeRotation),
      });
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

      dispatchNavigation({
        type: 'select_post',
        countryId: parentCountryId ?? undefined,
        locationId: parentLocationId ?? undefined,
        postId: postNode.post.id,
        markerId: postNode.id,
        freezeRotation: Boolean(options?.freezeRotation),
        incrementFocus: true,
      });
      openViewer(postNode.post.id);
      return;
    }

    const locationNode = locationNodes.find((node) => node.id === markerId);
    if (!locationNode) {
      return;
    }

    dispatchNavigation({
      type: 'select_location',
      countryId:
        countryNodes.find((node) => node.label === locationNode.country)?.id ??
        selectedCountry.id,
      locationId: locationNode.id,
      postId: locationNode.posts[0]?.id ?? activePost.id,
      freezeRotation: Boolean(options?.freezeRotation),
    });
  };

  const handleCenteredMarkerChange = (markerId: string | null) => {
    if (!markerId) {
      return;
    }

    const countryNode = countryNodes.find((node) => node.id === markerId);
    if (countryNode) {
      dispatchNavigation({
        type: 'center_selection',
        countryId: countryNode.id,
        locationId: countryNode.locations[0]?.id,
        postId: countryNode.locations[0]?.posts[0]?.id,
      });
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

      dispatchNavigation({
        type: 'center_selection',
        countryId: parentCountryId ?? undefined,
        locationId: locationId ?? undefined,
        postId: postNode.post.id,
      });
      return;
    }

    const locationNode = locationNodes.find((node) => node.id === markerId);
    if (!locationNode) {
      return;
    }

    const parentCountryId =
      countryNodes.find((node) => node.label === locationNode.country)?.id ??
      null;
    dispatchNavigation({
      type: 'center_selection',
      countryId: parentCountryId ?? undefined,
      locationId: locationNode.id,
      postId: locationNode.posts[0]?.id,
    });
  };

  const resetAtlasView = () => {
    dispatchNavigation({
      type: 'reset',
      selection: {
        countryId: initialCountryId,
        locationId: initialLocationId,
        postId: initialPost?.id ?? atlasPosts[0].id,
      },
    });
  };

  const navigateToAtlasLevel = (level: Exclude<ZoomTier, 'place'>) => {
    const targetId =
      level === 'world' ? selectedCountry.id : selectedLocation.id;

    dispatchNavigation({
      type: 'navigate',
      tier: level,
      targetId,
    });
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
                onUserInteraction={() =>
                  dispatchNavigation({
                    type: 'set_rotation_frozen',
                    frozen: true,
                  })
                }
                theme={atlasTheme}
                reduceMotion={shouldReduceMotion}
              />

              <div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex items-start justify-between gap-3 p-3 sm:p-5">
                <nav
                  aria-label={t('locationNavigation')}
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
                          {t('world')}
                        </span>
                      ) : (
                        <button
                          type="button"
                          className="block min-h-11 truncate rounded-lg px-1.5 py-2 text-[var(--atlas-muted)] outline-none transition-colors hover:text-[var(--atlas-ink)] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--atlas-accent)] sm:px-2.5"
                          onClick={() => navigateToAtlasLevel('world')}
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

                <div className="bg-[var(--atlas-card)]/90 pointer-events-auto flex shrink-0 overflow-hidden rounded-xl border border-[var(--atlas-rule)] shadow-lg shadow-[var(--atlas-shadow)] backdrop-blur-md">
                  <button
                    type="button"
                    className={cn(
                      ATLAS_CONTROL_CLASSNAME,
                      'border-r border-[var(--atlas-rule)]',
                    )}
                    onClick={() => {
                      dispatchNavigation({
                        type: 'set_rotation_frozen',
                        frozen: true,
                      });
                      handleZoomScaleChange((current) => current * 0.82);
                    }}
                    aria-label={t('zoomOut')}
                    title={t('zoomOut')}
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
                      dispatchNavigation({
                        type: 'set_rotation_frozen',
                        frozen: true,
                      });
                      handleZoomScaleChange((current) => current * 1.22);
                    }}
                    aria-label={t('zoomIn')}
                    title={t('zoomIn')}
                  >
                    <Plus className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    className={ATLAS_CONTROL_CLASSNAME}
                    onClick={resetAtlasView}
                    aria-label={t('resetView')}
                    title={t('resetView')}
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
                        meta={t('dockMeta', {
                          placeCount: country.count,
                          postCount: country.postCount,
                        })}
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

                          dispatchNavigation({
                            type: 'select_post',
                            countryId: parentCountryId ?? undefined,
                            locationId: parentLocationId ?? undefined,
                            postId: post.id,
                            markerId: `post-${post.id}`,
                            freezeRotation: true,
                            incrementFocus: false,
                          });
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

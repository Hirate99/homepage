/* eslint-disable @next/next/no-img-element */
import {
  type CSSProperties,
  type MouseEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import useEmblaCarousel from 'embla-carousel-react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

import { type CityPost } from '@/lib/collections';
import { clipCDNImage, cn } from '@/lib/utils';
import {
  useBreakingPoint,
  type TBreakingPointSizeConfig,
} from '@/hooks/use-breaking-point';

interface CityPostsProps {
  posts: CityPost[];
}

export interface CardRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

const FALLBACK_COVER_ASPECT_RATIO = 4 / 5;
const MIN_COVER_ASPECT_RATIO = 2 / 3;
const MAX_COVER_ASPECT_RATIO = 3 / 2;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getCoverAspectRatio(width: number | null, height: number | null) {
  if (!width || !height || width <= 0 || height <= 0) {
    return FALLBACK_COVER_ASPECT_RATIO;
  }

  return clamp(width / height, MIN_COVER_ASPECT_RATIO, MAX_COVER_ASPECT_RATIO);
}

function getExpandedTargetRect({
  viewportWidth,
  viewportHeight,
  originRect,
}: {
  viewportWidth: number;
  viewportHeight: number;
  originRect: CardRect;
}) {
  if (!viewportWidth || !viewportHeight) {
    return originRect;
  }

  const isDesktop = viewportWidth >= 640;
  const width = isDesktop
    ? Math.min(viewportWidth * 0.88, 1080)
    : viewportWidth - 16;
  const height = isDesktop
    ? viewportHeight * 0.86
    : Math.min(viewportHeight * 0.8, Math.max(width * 1.45, 520));

  return {
    x: (viewportWidth - width) / 2,
    y: (viewportHeight - height) / 2,
    width,
    height,
  };
}

function formatSlideNumber(value: number) {
  return value.toString().padStart(2, '0');
}

function PostCard({
  post,
  onOpen,
  isActive,
}: {
  post: CityPost;
  onOpen: (id: string, rect: CardRect) => void;
  isActive: boolean;
}) {
  const coverAspectRatio = getCoverAspectRatio(
    post.coverWidth,
    post.coverHeight,
  );
  const [isCoverLoaded, setIsCoverLoaded] = useState(false);
  const [skipTransition, setSkipTransition] = useState(false);
  const coverImgRef = useRef<HTMLImageElement>(null);
  const coverAspectStyle = {
    '--cover-aspect-ratio': coverAspectRatio.toString(),
  } as CSSProperties;

  useEffect(() => {
    if (coverImgRef.current?.complete && coverImgRef.current.naturalWidth > 0) {
      setIsCoverLoaded(true);
      setSkipTransition(true);
    }
  }, []);

  const handleOpen = (event: MouseEvent<HTMLButtonElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    onOpen(post.id, {
      x: rect.left,
      y: rect.top,
      width: rect.width,
      height: rect.height,
    });
  };

  return (
    <button
      type="button"
      onClick={handleOpen}
      className={cn(
        'group relative overflow-hidden rounded-[1.5rem] border border-black/10 bg-white text-left shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition',
        'sm:border-orange-500/15 sm:shadow-md sm:shadow-orange-900/10',
        'sm:hover:-translate-y-0.5 sm:hover:shadow-lg sm:hover:shadow-orange-900/20',
        'cursor-pointer duration-300',
        isActive ? 'pointer-events-none opacity-0' : 'opacity-100',
      )}
      aria-label={`Open post for ${post.city}`}
    >
      <div
        className="relative w-full overflow-hidden [aspect-ratio:var(--cover-aspect-ratio)]"
        style={coverAspectStyle}
      >
        {!skipTransition && (
          <div
            aria-hidden="true"
            className={cn(
              'absolute inset-0 animate-shimmer rounded-none bg-[length:200%_100%] transition-opacity duration-700',
              'bg-gradient-to-r from-orange-100/60 via-orange-50/90 to-orange-100/60',
              isCoverLoaded ? 'pointer-events-none opacity-0' : 'opacity-100',
            )}
          />
        )}
        <img
          ref={coverImgRef}
          className={cn(
            'h-full w-full object-contain sm:object-cover sm:group-hover:scale-[1.02]',
            skipTransition
              ? 'opacity-100'
              : cn(
                  'transition-opacity duration-500',
                  isCoverLoaded ? 'opacity-100' : 'opacity-0',
                ),
          )}
          src={clipCDNImage(post.cover, { width: 720, quality: 78 })}
          alt={`${post.city} cover`}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onLoad={() => setIsCoverLoaded(true)}
          onError={() => setIsCoverLoaded(true)}
        />
      </div>
      <div className="border-t border-black/10 bg-white px-3 py-2 shadow-[0_-1px_0_rgba(255,255,255,0.85)_inset,0_-4px_10px_-10px_rgba(0,0,0,0.25)] sm:hidden">
        <p className="line-clamp-1 text-[14px] font-medium leading-5 tracking-[-0.01em] text-[--orange-8]">
          {post.city}
        </p>
      </div>
      <div className="hidden border-t border-orange-100/80 bg-gradient-to-b from-white to-orange-50/30 px-2.5 pb-2 pt-2 sm:block sm:px-4 sm:pb-4 sm:pt-3.5">
        <p className="line-clamp-2 text-[14px] font-semibold leading-[1.3] tracking-tight text-neutral-900 sm:text-[17px]">
          {post.city}
        </p>
      </div>
    </button>
  );
}

export function ExpandedPost({
  post,
  onClose,
  originRect,
}: {
  post: CityPost;
  onClose: () => void;
  originRect: CardRect;
}) {
  const initialSlideIndex = useMemo(() => {
    const idx = post.images.indexOf(post.cover);
    return idx >= 0 ? idx : 0;
  }, [post.cover, post.images]);

  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: 'center',
    dragFree: false,
    loop: false,
    startIndex: initialSlideIndex,
  });
  const [selectedIndex, setSelectedIndex] = useState(initialSlideIndex);
  const [loadedSlideMap, setLoadedSlideMap] = useState<Record<number, boolean>>(
    () => ({ [initialSlideIndex]: true }),
  );
  const [viewport, setViewport] = useState(() => ({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
  }));
  const [showNavControls, setShowNavControls] = useState(true);
  const hideNavControlsTimeoutRef = useRef<number | null>(null);

  const targetRect = useMemo(
    () =>
      getExpandedTargetRect({
        viewportWidth: viewport.width,
        viewportHeight: viewport.height,
        originRect,
      }),
    [originRect, viewport.height, viewport.width],
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
      if (event.key === 'ArrowLeft') {
        emblaApi?.scrollPrev();
      }
      if (event.key === 'ArrowRight') {
        emblaApi?.scrollNext();
      }
    };

    const previousOverflow = document.body.style.overflow;
    const previousPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth =
      window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.paddingRight = previousPaddingRight;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [emblaApi, onClose]);

  useEffect(() => {
    if (!emblaApi) {
      return;
    }

    emblaApi.scrollTo(initialSlideIndex, true);

    const onSelect = () => {
      setSelectedIndex(emblaApi.selectedScrollSnap());
    };

    onSelect();
    emblaApi.on('select', onSelect);
    emblaApi.on('reInit', onSelect);

    return () => {
      emblaApi.off('select', onSelect);
      emblaApi.off('reInit', onSelect);
    };
  }, [emblaApi, initialSlideIndex]);

  useEffect(() => {
    const onResize = () => {
      setViewport({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
    };
  }, []);

  useEffect(() => {
    if (viewport.width < 640) {
      setShowNavControls(false);
      return;
    }

    setShowNavControls(true);
    if (hideNavControlsTimeoutRef.current !== null) {
      window.clearTimeout(hideNavControlsTimeoutRef.current);
    }
    hideNavControlsTimeoutRef.current = window.setTimeout(() => {
      setShowNavControls(false);
    }, 1400);

    return () => {
      if (hideNavControlsTimeoutRef.current !== null) {
        window.clearTimeout(hideNavControlsTimeoutRef.current);
        hideNavControlsTimeoutRef.current = null;
      }
    };
  }, [selectedIndex, viewport.width]);

  const showNavControlsTemporarily = () => {
    if (viewport.width < 640) {
      return;
    }

    setShowNavControls(true);
    if (hideNavControlsTimeoutRef.current !== null) {
      window.clearTimeout(hideNavControlsTimeoutRef.current);
    }
    hideNavControlsTimeoutRef.current = window.setTimeout(() => {
      setShowNavControls(false);
    }, 1400);
  };

  const modal = (
    <div className="fixed inset-0 z-[120]">
      <motion.button
        type="button"
        className="absolute inset-0 cursor-pointer bg-black/75 backdrop-blur-[4px]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        aria-label="Close expanded post"
        onClick={onClose}
      />
      <motion.div
        className={cn(
          'absolute overflow-hidden rounded-[2rem] bg-[#0f1013] text-white',
          'border border-white/20 shadow-[0_20px_80px_rgba(0,0,0,0.65)]',
        )}
        initial={{
          x: originRect.x,
          y: originRect.y,
          width: originRect.width,
          height: originRect.height,
          borderRadius: 24,
          opacity: 1,
        }}
        animate={{
          x: targetRect.x,
          y: targetRect.y,
          width: targetRect.width,
          height: targetRect.height,
          borderRadius: 32,
          opacity: 1,
        }}
        exit={{
          x: originRect.x,
          y: originRect.y,
          width: originRect.width,
          height: originRect.height,
          borderRadius: 24,
          opacity: 0,
        }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      >
        <motion.article
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.2, delay: 0.08, ease: 'easeOut' }}
          className="relative flex h-full flex-col overflow-hidden bg-[#0f1013]"
          role="dialog"
          aria-modal="true"
          aria-label={`${post.city} photo post`}
        >
          <div
            className="relative min-h-0 flex-1 bg-black/35"
            onMouseMove={showNavControlsTemporarily}
            onMouseEnter={showNavControlsTemporarily}
          >
            <button
              type="button"
              onClick={onClose}
              className="absolute right-3 top-3 z-20 grid h-10 w-10 cursor-pointer place-items-center rounded-full border border-white/20 bg-black/45 text-white transition hover:bg-black/65 sm:right-4 sm:top-4"
              aria-label="Close post"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="via-black/12 pointer-events-none absolute inset-x-0 top-0 z-10 h-24 bg-gradient-to-b from-black/40 to-transparent" />
            <div className="pointer-events-none absolute left-3 top-3 z-10 sm:left-4 sm:top-4">
              <div className="border-white/12 inline-flex items-center gap-2 rounded-full border bg-black/30 px-3 py-1.5 backdrop-blur-md">
                <span className="text-white/72 text-xs">
                  {formatSlideNumber(selectedIndex + 1)}/
                  {formatSlideNumber(post.images.length)}
                </span>
              </div>
            </div>

            <div className="h-full min-h-0 overflow-hidden" ref={emblaRef}>
              <div className="flex h-full min-h-0">
                {post.images.map((src, index) => (
                  <div
                    key={`${src}-${index}`}
                    className="flex h-full min-h-0 min-w-0 flex-[0_0_100%] select-none overflow-hidden"
                  >
                    <div className="relative h-full min-h-0 w-full overflow-hidden">
                      <div
                        className={cn(
                          'from-orange-100/16 via-orange-200/12 absolute inset-0 bg-gradient-to-br to-orange-50/10 transition-opacity',
                          index === initialSlideIndex
                            ? 'duration-0'
                            : 'duration-1000',
                          loadedSlideMap[index]
                            ? 'pointer-events-none opacity-0'
                            : 'opacity-70',
                        )}
                      />
                      <img
                        src={clipCDNImage(src, { width: 1280, quality: 82 })}
                        alt={`${post.city} photo ${index + 1}`}
                        className={cn(
                          'block h-full w-full object-contain transition-opacity',
                          index === initialSlideIndex
                            ? 'duration-0'
                            : 'duration-1000',
                          loadedSlideMap[index] ? 'opacity-100' : 'opacity-0',
                        )}
                        loading={index <= selectedIndex + 1 ? 'eager' : 'lazy'}
                        decoding="async"
                        referrerPolicy="no-referrer"
                        onLoad={() => {
                          setLoadedSlideMap((prev) =>
                            prev[index] ? prev : { ...prev, [index]: true },
                          );
                        }}
                        onError={() => {
                          setLoadedSlideMap((prev) =>
                            prev[index] ? prev : { ...prev, [index]: true },
                          );
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                showNavControlsTemporarily();
                emblaApi?.scrollPrev();
              }}
              className={cn(
                'absolute left-2 top-1/2 z-20 hidden h-10 w-10 -translate-y-1/2 cursor-pointer place-items-center rounded-full border border-white/35 bg-black/60 text-white backdrop-blur-[2px] transition-opacity duration-300 sm:left-4 sm:grid',
                showNavControls
                  ? 'sm:opacity-100'
                  : 'sm:pointer-events-none sm:opacity-0',
              )}
              aria-label="Previous photo"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={() => {
                showNavControlsTemporarily();
                emblaApi?.scrollNext();
              }}
              className={cn(
                'absolute right-2 top-1/2 z-20 hidden h-10 w-10 -translate-y-1/2 cursor-pointer place-items-center rounded-full border border-white/35 bg-black/60 text-white backdrop-blur-[2px] transition-opacity duration-300 sm:right-4 sm:grid',
                showNavControls
                  ? 'sm:opacity-100'
                  : 'sm:pointer-events-none sm:opacity-0',
              )}
              aria-label="Next photo"
            >
              <ChevronRight className="h-4 w-4" />
            </button>

            <div className="pointer-events-none absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-black/35 px-2 py-1">
              {post.images.map((_, idx) => (
                <span
                  key={`progress-${idx}`}
                  className={cn(
                    'h-1 rounded-full transition-all duration-300',
                    idx === selectedIndex ? 'w-6 bg-white' : 'w-2 bg-white/40',
                  )}
                />
              ))}
            </div>
          </div>
          <footer className="shrink-0 border-t border-white/10 bg-[linear-gradient(180deg,#121418_0%,#181c22_100%)] px-4 py-4 sm:px-6 sm:py-5">
            <div className="grid gap-4 sm:gap-6">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  {post.location?.region && (
                    <span className="text-white/62 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px]">
                      {post.location.region}
                    </span>
                  )}
                </div>

                <h3 className="mt-3 text-xl font-semibold tracking-tight text-white sm:text-[2rem]">
                  {post.location?.locationName ?? post.city}
                </h3>

                {post.location?.description && (
                  <div className="mt-4 rounded-[1.5rem] bg-white/[0.035] px-4 py-3.5">
                    <p className="text-white/72 text-sm leading-6 sm:text-[15px]">
                      {post.location.description}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </footer>
        </motion.article>
      </motion.div>
    </div>
  );

  if (typeof window === 'undefined') {
    return null;
  }

  return createPortal(modal, document.body);
}

const MASONRY_COLUMNS: TBreakingPointSizeConfig<number> = {
  mobile: 1,
  sm: 2,
  md: 3,
};

function distributeToColumns(posts: CityPost[], columnCount: number) {
  const columns: CityPost[][] = Array.from({ length: columnCount }, () => []);
  const heights = new Array<number>(columnCount).fill(0);

  for (const post of posts) {
    const shortest = heights.indexOf(Math.min(...heights));
    columns[shortest].push(post);
    heights[shortest] +=
      1 / getCoverAspectRatio(post.coverWidth, post.coverHeight);
  }

  return columns;
}

export function CityPosts({ posts }: CityPostsProps) {
  const { responsive, sizes } = useBreakingPoint(MASONRY_COLUMNS);
  const columnCount = sizes?.[responsive] ?? 1;

  const [activePostState, setActivePostState] = useState<{
    id: string;
    originRect: CardRect;
  } | null>(null);

  const activePost = useMemo(
    () => posts.find((post) => post.id === activePostState?.id) ?? null,
    [activePostState?.id, posts],
  );

  const columns = useMemo(
    () => distributeToColumns(posts, columnCount),
    [posts, columnCount],
  );

  return (
    <>
      <div className="mx-auto flex w-full max-w-screen-xl gap-3 px-4 pb-8 sm:gap-5">
        {columns.map((column, colIndex) => (
          <div key={colIndex} className="flex flex-1 flex-col gap-3 sm:gap-5">
            {column.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                onOpen={(id, originRect) =>
                  setActivePostState({ id, originRect })
                }
                isActive={activePostState?.id === post.id}
              />
            ))}
          </div>
        ))}
      </div>
      <AnimatePresence mode="wait">
        {activePost && (
          <ExpandedPost
            post={activePost}
            originRect={activePostState!.originRect}
            onClose={() => setActivePostState(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}

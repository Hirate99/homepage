/* eslint-disable @next/next/no-img-element */
import { type MouseEvent, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import useEmblaCarousel from 'embla-carousel-react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

import { type CityPost } from '@/lib/collections';
import { clipCDNImage, cn } from '@/lib/utils';

interface CityPostsProps {
  posts: CityPost[];
}

interface CardRect {
  x: number;
  y: number;
  width: number;
  height: number;
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
  const [coverAspect, setCoverAspect] = useState<number | null>(null);
  const needsMobileCrop = coverAspect !== null && coverAspect > 1.5;

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
        'group relative overflow-hidden rounded-2xl border border-orange-500/15 bg-white text-left shadow-md shadow-orange-900/10 transition',
        'hover:-translate-y-0.5 hover:shadow-lg hover:shadow-orange-900/20',
        'cursor-pointer duration-300',
        isActive ? 'pointer-events-none opacity-0' : 'opacity-100',
      )}
      aria-label={`Open post for ${post.city}`}
    >
      <div className="relative w-full overflow-hidden">
        <img
          className={cn(
            'h-auto w-full object-cover transition duration-500 group-hover:scale-[1.02]',
            needsMobileCrop && 'aspect-[3/2] sm:aspect-auto',
          )}
          src={clipCDNImage(post.cover, { width: 720, quality: 78 })}
          alt={`${post.city} cover`}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onLoad={(event) => {
            const { naturalWidth, naturalHeight } = event.currentTarget;
            if (!naturalWidth || !naturalHeight) {
              return;
            }
            setCoverAspect(naturalWidth / naturalHeight);
          }}
        />
      </div>
      <div className="border-t border-orange-100/80 bg-gradient-to-b from-white to-orange-50/30 px-2.5 pb-2 pt-2 sm:px-4 sm:pb-4 sm:pt-3.5">
        <p className="line-clamp-2 text-[14px] font-semibold leading-[1.3] tracking-tight text-neutral-900 sm:text-[17px]">
          {post.city}
        </p>
      </div>
    </button>
  );
}

function ExpandedPost({
  post,
  onClose,
  originRect,
}: {
  post: CityPost;
  onClose: () => void;
  originRect: CardRect;
}) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: 'center',
    dragFree: false,
    loop: false,
  });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [viewport, setViewport] = useState(() => ({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
  }));
  const [showNavControls, setShowNavControls] = useState(true);
  const hideNavControlsTimeoutRef = useRef<number | null>(null);

  const targetRect = useMemo(() => {
    const vw = viewport.width;
    const vh = viewport.height;
    if (!vw || !vh) {
      return originRect;
    }

    const isDesktop = vw >= 640;
    const width = isDesktop ? Math.min(vw * 0.88, 1080) : vw - 16;
    const height = isDesktop
      ? vh * 0.86
      : Math.min(vh * 0.8, Math.max(width * 1.45, 520));

    return {
      x: (vw - width) / 2,
      y: (vh - height) / 2,
      width,
      height,
    };
  }, [originRect, viewport.height, viewport.width]);

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
  }, [emblaApi]);

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
          'absolute overflow-hidden rounded-2xl bg-[#0f1013] text-white',
          'border border-white/20 shadow-[0_20px_80px_rgba(0,0,0,0.65)] sm:rounded-3xl',
        )}
        initial={{
          x: originRect.x,
          y: originRect.y,
          width: originRect.width,
          height: originRect.height,
          borderRadius: 16,
          opacity: 1,
        }}
        animate={{
          x: targetRect.x,
          y: targetRect.y,
          width: targetRect.width,
          height: targetRect.height,
          borderRadius: viewport.width >= 640 ? 24 : 16,
          opacity: 1,
        }}
        exit={{
          x: originRect.x,
          y: originRect.y,
          width: originRect.width,
          height: originRect.height,
          borderRadius: 16,
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
              className="absolute right-3 top-3 z-20 hidden h-10 w-10 cursor-pointer place-items-center rounded-full border border-white/20 bg-black/40 text-white transition hover:bg-black/65 sm:right-4 sm:top-4 sm:grid"
              aria-label="Close post"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="h-full min-h-0 overflow-hidden" ref={emblaRef}>
              <div className="flex h-full min-h-0">
                {post.images.map((src, index) => (
                  <div
                    key={`${src}-${index}`}
                    className="flex h-full min-h-0 min-w-0 flex-[0_0_100%] select-none overflow-hidden"
                  >
                    <div className="h-full min-h-0 w-full overflow-hidden">
                      <img
                        src={clipCDNImage(src, { width: 1280, quality: 82 })}
                        alt={`${post.city} photo ${index + 1}`}
                        className="block h-full w-full object-contain"
                        loading={index <= selectedIndex + 1 ? 'eager' : 'lazy'}
                        decoding="async"
                        referrerPolicy="no-referrer"
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
          <footer className="shrink-0 border-t border-white/10 bg-[#111317] px-4 py-3 sm:px-6 sm:py-4">
            <p className="text-[10px] uppercase tracking-[0.24em] text-orange-200/80">
              Photo Journal
            </p>
            <h3 className="text-lg font-semibold text-white sm:text-2xl">
              {post.city}
            </h3>
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

export function CityPosts({ posts }: CityPostsProps) {
  const [activePostState, setActivePostState] = useState<{
    id: string;
    originRect: CardRect;
  } | null>(null);

  const activePost = useMemo(
    () => posts.find((post) => post.id === activePostState?.id) ?? null,
    [activePostState?.id, posts],
  );

  return (
    <>
      <div className="mx-auto w-full max-w-screen-xl columns-2 gap-1 px-2 pb-8 [column-fill:_balance] sm:gap-5 md:columns-3">
        {posts.map((post) => (
          <div key={post.id} className="mb-3 break-inside-avoid sm:mb-5">
            <PostCard
              post={post}
              onOpen={(id, originRect) =>
                setActivePostState({ id, originRect })
              }
              isActive={activePostState?.id === post.id}
            />
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

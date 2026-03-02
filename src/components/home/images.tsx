/* eslint-disable @next/next/no-img-element */
import { memo, useCallback, useEffect, useState } from 'react';
import Masonry, { ResponsiveMasonry } from 'react-responsive-masonry';

import { motion } from 'framer-motion';

import { ImageSkeleton } from '@/components/home/image-skeleton';
import { type DisplayImage } from '@/lib/collections';
import { useResize } from '@/hooks/use-resize';

import { clipCDNImage, cn } from '@/lib/utils';

const BATCH_SIZE = 5;

interface IImageTileProps {
  image: DisplayImage;
  index: number;
  onLoad: (index: number) => void;
  isLoaded: boolean;
}

const ImageTile = memo(function ImageTile({
  image,
  onLoad,
  index,
  isLoaded,
}: IImageTileProps) {
  const handleLoad = useCallback(() => {
    onLoad(index);
  }, [index, onLoad]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 25 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: (index % BATCH_SIZE) * 0.04 }}
      className="group relative w-full overflow-hidden rounded-lg"
    >
      {!isLoaded && <ImageSkeleton />}
      <a
        href={image.src}
        target="_blank"
        rel="noopener noreferrer"
        style={{ display: isLoaded ? 'block' : 'none' }}
      >
        <img
          className={cn(
            'w-full transition-all duration-500 hover:cursor-pointer',
            'group-hover:scale-110',
            isLoaded ? 'opacity-100' : 'opacity-0',
          )}
          src={clipCDNImage(image.src, { width: 500 })}
          alt=""
          loading={index < BATCH_SIZE ? 'eager' : 'lazy'}
          fetchPriority={index < 2 ? 'high' : 'auto'}
          decoding="async"
          referrerPolicy="no-referrer"
          onLoad={handleLoad}
        />
      </a>
      {image.tag && isLoaded && (
        <div
          className={cn(
            'absolute bottom-0 left-0 w-full bg-gradient-to-t from-slate-700/80 to-slate-50/0 px-2 py-1 font-sans text-sm font-light text-white opacity-0 transition-opacity hover:cursor-pointer',
            'group-hover:opacity-100',
          )}
        >
          {image.tag}
        </div>
      )}
    </motion.div>
  );
});

ImageTile.displayName = 'ImageTile';

export function Images({ images }: { images: DisplayImage[] }) {
  const [columns, setColumns] = useState(0);
  const [visibleCount, setVisibleCount] = useState(BATCH_SIZE);
  const [imageLoaded, setImageLoaded] = useState(
    Array(images.length).fill(false),
  );

  useResize(() => {
    setColumns(window.innerWidth < 750 ? 2 : 3);
  }, true);

  useEffect(() => {
    setVisibleCount(BATCH_SIZE);
    setImageLoaded(Array(images.length).fill(false));
  }, [images.length]);

  useEffect(() => {
    const allVisibleImagesLoaded = imageLoaded
      .slice(0, visibleCount)
      .every(Boolean);

    if (allVisibleImagesLoaded && visibleCount < images.length) {
      setVisibleCount((prevCount) =>
        Math.min(prevCount + BATCH_SIZE, images.length),
      );
    }
  }, [imageLoaded, visibleCount, images.length]);

  const handleImageLoad = useCallback((index: number) => {
    setImageLoaded((current) => {
      if (current[index]) return current;
      const newLoaded = [...current];
      newLoaded[index] = true;
      return newLoaded;
    });
  }, []);

  return (
    <>
      {!!columns && (
        <ResponsiveMasonry
          className="m-2 p-2 pb-4"
          columnsCountBreakPoints={{ 350: 2, 750: 3 }}
        >
          <Masonry columnsCount={columns}>
            {images.slice(0, visibleCount).map((image, idx) => (
              <ImageTile
                key={image.src}
                image={image}
                index={idx}
                onLoad={handleImageLoad}
                isLoaded={imageLoaded[idx]}
              />
            ))}
          </Masonry>
        </ResponsiveMasonry>
      )}
    </>
  );
}

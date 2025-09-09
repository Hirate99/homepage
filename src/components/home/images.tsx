/* eslint-disable @next/next/no-img-element */
import { memo, useCallback, useEffect, useState } from 'react';
import Masonry, { ResponsiveMasonry } from 'react-responsive-masonry';

import { motion } from 'framer-motion';

import { useHover } from '@/hooks/use-hover';
import { useResize } from '@/hooks/use-resize';

import { clipCDNImage, cn } from '@/lib/utils';

export interface IDisplayImage {
  tag?: string;
  src: string;
}

const BATCH_SIZE = 10;

interface IImageTileProps {
  image: IDisplayImage;
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
  const { isHover, props } = useHover<HTMLDivElement>();

  const handleLoad = useCallback(() => {
    onLoad(index);
  }, [index, onLoad]);

  return (
    <motion.div
      {...props}
      initial={{ opacity: 0, y: 25 }}
      animate={{ opacity: isLoaded ? 1 : 0, y: isLoaded ? 0 : 25 }}
      transition={{ duration: 0.5, delay: Math.random() * 0.2 }}
      className="relative overflow-hidden rounded-lg"
    >
      <a href={image.src} target="_blank">
        <img
          className={cn(
            'transition-all duration-500 hover:cursor-pointer',
            isHover ? 'scale-110' : '',
          )}
          src={clipCDNImage(image.src, { width: 500 })}
          alt=""
          onLoad={handleLoad}
        />
      </a>
      {image.tag && (
        <div
          className={cn(
            'absolute bottom-0 left-0 w-full bg-gradient-to-t from-slate-700/80 to-slate-50/0 px-2 py-1 font-sans text-sm font-light text-white opacity-0 transition-opacity hover:cursor-pointer',
            isHover ? 'opacity-100' : 'opacity-0',
          )}
        >
          {image.tag}
        </div>
      )}
    </motion.div>
  );
});

ImageTile.displayName = 'ImageTile';

export function Images({ images }: { images: IDisplayImage[] }) {
  const [columns, setColumns] = useState(0);
  // Determines how many images are currently visible. Starts with the first batch.
  const [visibleCount, setVisibleCount] = useState(BATCH_SIZE);
  // Tracks the loading state of every image in the `images` array.
  const [imageLoaded, setImageLoaded] = useState(
    Array(images.length).fill(false),
  );

  useResize(() => {
    setColumns(window.innerWidth < 750 ? 2 : 3);
  }, true);

  // This effect is the core of the batch loading logic.
  useEffect(() => {
    // Check if all images in the *current* visible batch are loaded.
    const allVisibleImagesLoaded = imageLoaded
      .slice(0, visibleCount)
      .every(Boolean);

    // If all visible images are loaded and there are more images to show,
    // increase the visible count to reveal the next batch.
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
            {/* Only render the images that are currently visible */}
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

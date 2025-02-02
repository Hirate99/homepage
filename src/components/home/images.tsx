/* eslint-disable @next/next/no-img-element */
import { useState } from 'react';
import Masonry, { ResponsiveMasonry } from 'react-responsive-masonry';

import { motion } from 'framer-motion';

import { useHover } from '@/hooks/use-hover';
import { useResize } from '@/hooks/use-resize';

import { clipCDNImage, cn } from '@/lib/utils';

export interface IDisplayImage {
  tag?: string;
  src: string;
}

function ImageTile({ image }: { image: IDisplayImage }) {
  const { isHover, props } = useHover<HTMLDivElement>();

  return (
    <motion.div
      {...props}
      initial={{ opacity: 0, y: 25 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: Math.random() * 0.5 }}
      viewport={{ once: true }}
      className="relative overflow-hidden rounded-lg"
    >
      <a href={image.src} target="_blank">
        <img
          className="transition-all duration-500 hover:scale-110 hover:cursor-pointer"
          src={clipCDNImage(image.src, { width: 500 })}
          alt=""
        />
      </a>
      {image.tag && (
        <div
          className={cn(
            'absolute bottom-0 left-0 w-full bg-gradient-to-t from-slate-700/80 to-slate-50/0 px-2 py-1 font-sans text-sm font-light text-white opacity-0 transition-opacity',
            isHover ? 'opacity-100' : 'opacity-0',
          )}
        >
          {image.tag}
        </div>
      )}
    </motion.div>
  );
}

export function Images({ images }: { images: IDisplayImage[] }) {
  const [columns, setColumns] = useState(0);

  useResize(() => {
    setColumns(window.innerWidth < 750 ? 2 : 3);
  }, true);

  return (
    <>
      {!!columns && (
        <ResponsiveMasonry
          className="m-2 p-2 pb-4"
          columnsCountBreakPoints={{ 350: 2, 750: 3 }}
        >
          <Masonry columnsCount={columns}>
            {images.map((image, idx) => (
              <ImageTile key={idx} image={image} />
            ))}
          </Masonry>
        </ResponsiveMasonry>
      )}
    </>
  );
}

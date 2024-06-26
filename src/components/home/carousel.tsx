'use client';

import React, { useEffect, useState } from 'react';
import { EmblaOptionsType, EmblaCarouselType } from 'embla-carousel';
import useEmblaCarousel from 'embla-carousel-react';

import { cn, combineEffects } from '@/lib/utils';
import { registerInterval } from '@/utils/interval';
import { domEvent } from '@/lib/dom-events';

type PropType = {
  options?: EmblaOptionsType;
  onSlideFocus?: (idx: number) => void;
  slides?: string[];
};

export const EmblaCarousel: React.FC<PropType> = ({
  slides,
  options,
  onSlideFocus,
}) => {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    axis: 'y',
    loop: true,
    watchDrag: false,
    ...options,
  });

  const [visible, setVisible] = useState(true);

  useEffect(() => {
    return domEvent(document, 'visibilitychange', () => {
      setVisible(document.visibilityState === 'visible');
    });
  }, []);

  useEffect(() => {
    if (!visible) {
      return;
    }

    const onSelect = (e: EmblaCarouselType) => {
      onSlideFocus?.(e.selectedScrollSnap());
    };

    emblaApi?.on('select', onSelect);
    return combineEffects(
      registerInterval(() => {
        emblaApi?.scrollNext();
      }, 4000),
      () => {
        emblaApi?.off('select', onSelect);
      },
    );
  }, [emblaApi, onSlideFocus, visible]);

  return (
    <section className="embla">
      <div className="embla__viewport" ref={emblaRef}>
        <div
          className={cn(
            'embla__container flex-col',
            'text-5xl text-[--orange-9]',
            'h-[100px] sm:h-[60px] md:h-[70px]',
          )}
        >
          {slides?.map((slide, idx) => (
            <div className="embla__slide my-2 font-black" key={idx}>
              {slide}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

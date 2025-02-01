import { useEffect, useRef, useState } from 'react';

import { combineEffects } from '@/lib/utils';
import { domEvent } from '@/lib/dom-events';

export function useHover<T extends HTMLElement = HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [isHover, setIsHover] = useState(false);

  useEffect(() => {
    if (!ref.current) {
      return;
    }

    return combineEffects(
      domEvent(ref.current, 'mouseenter', () => {
        setIsHover(true);
      }),
      domEvent(ref.current, 'mouseleave', () => {
        setIsHover(false);
      }),
    );
  }, [ref]);

  return {
    isHover,
    props: {
      ref,
    },
  };
}

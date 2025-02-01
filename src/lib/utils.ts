import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const R2_ZONE = 'https://r2.mskyurina.top';

export function cdn(name: string) {
  return `${R2_ZONE}/${name}`;
}

export function combineEffects(...effects: (() => void)[]) {
  return () => {
    for (const ret of effects) {
      ret();
    }
  };
}

export function clipCDNImage(
  url: string,
  { width = 700, quality = 75 }: { width?: number; quality?: number } = {
    width: 700,
    quality: 75,
  },
) {
  const name = url.split(R2_ZONE).pop();
  return `${R2_ZONE}/cdn-cgi/image/width=${width},quality=${quality}${name}`;
}

import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function cdn(name: string) {
  return `https://r2.mskyurina.top/${name}`;
}

export function combineEffects(...effects: (() => void)[]) {
  return () => {
    for (const ret of effects) {
      ret();
    }
  };
}

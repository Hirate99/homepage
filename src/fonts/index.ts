import { Noto_Serif_SC, Oswald } from 'next/font/google';
import localFont from 'next/font/local';

export const notoSerif = Noto_Serif_SC({
  subsets: ['latin'],
  display: 'swap',
  weight: ['500'],
});

export const bodoni72OldstyleBook = localFont({
  src: './bodoni/Bodoni72OldStyle-Book.ttf',
  display: 'swap',
});

export const oswald = Oswald({
  subsets: ['latin'],
  display: 'swap',
});

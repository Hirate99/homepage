import type { Metadata } from 'next';
import { Noto_Sans_SC, Noto_Serif_SC } from 'next/font/google';

import './globals.css';

const notoSerif = Noto_Serif_SC({
  subsets: ['latin'],
  display: 'swap',
  weight: ['500'],
  variable: '--font-display',
});

const notoSans = Noto_Sans_SC({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
});

export const metadata: Metadata = {
  title: 'Homepage Admin',
  description: 'Local publishing portal for homepage collections.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${notoSerif.variable} ${notoSans.variable}`}>
        {children}
      </body>
    </html>
  );
}

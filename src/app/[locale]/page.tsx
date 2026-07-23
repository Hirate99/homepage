import { type Viewport } from 'next';
import { notFound } from 'next/navigation';

import { hasLocale } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';

import { Home } from '@/components/home';
import { findSong, getRandomSong } from '@/components/home/songs';
import { routing } from '@/i18n/routing';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export const dynamic = 'force-dynamic';

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ song?: string | string[] }>;
}) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);

  const query = await searchParams;
  const requestedSong = Array.isArray(query.song) ? query.song[0] : query.song;
  const song = findSong(requestedSong ?? null) ?? getRandomSong();

  return <Home song={song} />;
}

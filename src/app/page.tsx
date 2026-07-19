import { type Viewport } from 'next';

import { Home } from '@/components/home';
import { findSong, getRandomSong } from '@/components/home/songs';
import { getCityPosts } from '@/lib/collections';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ song?: string | string[] }>;
}) {
  const params = await searchParams;
  const requestedSong = Array.isArray(params.song)
    ? params.song[0]
    : params.song;
  const song = findSong(requestedSong ?? null) ?? getRandomSong();
  const posts = await getCityPosts();
  return <Home posts={posts} song={song} />;
}

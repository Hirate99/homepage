import { type Viewport } from 'next';

import { Home } from '@/components/home';
import { getCityPosts } from '@/lib/collections';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export default async function Page() {
  const posts = await getCityPosts();
  return <Home posts={posts} />;
}

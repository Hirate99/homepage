import { type Viewport } from 'next';

import { Home } from '@/components/home';
import { getDisplayImages } from '@/lib/collections';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export default async function Page() {
  const images = await getDisplayImages();
  return <Home images={images} />;
}

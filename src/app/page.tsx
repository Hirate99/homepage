import { type Viewport } from 'next';

import { Home } from '@/components/home';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function Index() {
  return <Home />;
}

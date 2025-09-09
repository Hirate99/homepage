import { type Viewport } from 'next';

import PageClient from './page-client';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function Page() {
  return <PageClient />;
}

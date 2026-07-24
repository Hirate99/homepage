import createMiddleware from 'next-intl/middleware';

import { routing } from './i18n/routing';

// Keep the deprecated filename until OpenNext supports Next.js Node.js Proxy.
export default createMiddleware(routing);

export const config = {
  matcher: '/((?!api|_next|_vercel|.*\\..*).*)',
};

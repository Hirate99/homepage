import { NextResponse } from 'next/server';

export function middleware() {
  return NextResponse.next();
}

// Keep the homepage middleware outside the admin workspace in this monorepo.
export const config = {
  matcher: '/__admin_middleware_disabled__',
};

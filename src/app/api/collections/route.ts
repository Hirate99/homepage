import { NextResponse } from 'next/server';

import { getCityPosts, getDisplayImages } from '@/lib/collections';

export const runtime = 'edge';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const view = url.searchParams.get('view');

  if (view === 'flat') {
    const images = await getDisplayImages();
    return NextResponse.json(images);
  }

  const posts = await getCityPosts();
  return NextResponse.json(posts);
}

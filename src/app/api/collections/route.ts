import { NextResponse } from 'next/server';

import { getDisplayImages } from '@/lib/collections';

export const runtime = 'edge';

export async function GET() {
  const images = await getDisplayImages();
  return NextResponse.json(images);
}

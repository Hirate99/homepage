import { NextResponse } from 'next/server';
import _ from 'lodash';

import { prisma } from '@/lib/prisma';
import { redis } from '@/lib/redis';

interface IDBImage {
  title: string;
  images: {
    src: string;
  }[];
}

const getCollections = async (): Promise<IDBImage[] | null> => {
  const cached = await redis.get<IDBImage[]>('collections');
  if (cached) return cached;

  // Query D1 via Prisma
  const collections = await prisma().collection.findMany({
    select: {
      title: true,
      images: { select: { src: true } },
    },
    where: {
      title: {
        not: null,
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  // Cache result for 1hr
  await redis.set('collections', JSON.stringify(collections), { ex: 3600 });

  return collections as IDBImage[] | null;
};

export const runtime = 'edge';

export async function GET() {
  const collections = await getCollections();

  if (!collections) {
    return NextResponse.json([], { status: 404 });
  }

  const images = _.shuffle(collections)
    .map(({ images, title }) =>
      images.map(({ src }) => ({
        tag: title ?? '',
        src,
      })),
    )
    .flat();
  return NextResponse.json(images);
}

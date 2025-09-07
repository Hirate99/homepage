import { type Viewport } from 'next';

import _ from 'lodash';

import { Home } from '@/components/home';
import { prisma } from '@/lib/prisma';
import { redis } from '@/lib/redis';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export const runtime = 'edge';

export const revalidate = 3600;

interface IDBImage {
  title: string;
  images: {
    src: string;
  }[];
}

const getCollections = async () => {
  const cached = await redis.get<IDBImage[]>('collections');
  if (cached) return cached;

  // Query D1 via Prisma
  const collections = await prisma().collection.findMany({
    select: {
      title: true,
      images: { select: { src: true } },
    },
    orderBy: { createdAt: 'asc' },
  });

  // Cache result for 1hr
  await redis.set('collections', JSON.stringify(collections), { ex: 3600 });

  return collections;
};

export default async function Index() {
  const collections = await getCollections();

  const images = _.shuffle(collections)
    .map(({ images, title }) =>
      images.map(({ src }) => ({
        tag: title ?? '',
        src,
      })),
    )
    .flat();

  return <Home images={images} />;
}

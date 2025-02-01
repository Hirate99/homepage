import { type Viewport } from 'next';

import _ from 'lodash';

import { Home } from '@/components/home';
import { prisma } from '@/lib/prisma';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export const runtime = 'edge';

export const revalidate = 60;

export default async function Index() {
  const collections = await prisma().collection.findMany({
    select: {
      title: true,
      images: {
        select: {
          src: true,
        },
      },
    },
    orderBy: {
      createdAt: 'asc',
    },
  });

  const images = _.shuffle(
    collections
      .map(({ images, title }) =>
        images.map(({ src }) => ({
          tag: title ?? '',
          src,
        })),
      )
      .flat(),
  );

  return <Home images={images} />;
}

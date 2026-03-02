import { prisma } from '@/lib/prisma';
import { redis } from '@/lib/redis';

export interface DisplayImage {
  tag?: string;
  src: string;
}

interface DBCollection {
  title: string | null;
  images: {
    src: string;
  }[];
}

const CACHE_KEY = 'home:display-images:v1';
const CACHE_TTL_SECONDS = 3600;

function shuffle<T>(items: T[]) {
  const copied = [...items];
  for (let i = copied.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copied[i], copied[j]] = [copied[j], copied[i]];
  }
  return copied;
}

function parseCachedImages(cached: DisplayImage[] | string | null) {
  if (!cached) {
    return null;
  }
  if (Array.isArray(cached)) {
    return cached;
  }

  try {
    const parsed = JSON.parse(cached);
    return Array.isArray(parsed) ? (parsed as DisplayImage[]) : null;
  } catch {
    return null;
  }
}

export async function getDisplayImages() {
  try {
    const cached = await redis.get<DisplayImage[] | string>(CACHE_KEY);
    const cachedImages = parseCachedImages(cached);
    if (cachedImages) {
      return cachedImages;
    }
  } catch {
    // Ignore cache errors and fall through to DB query.
  }

  const collections = (await prisma().collection.findMany({
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
  })) as DBCollection[];

  const displayImages = shuffle(collections).flatMap(({ images, title }) =>
    images.map(({ src }) => ({
      tag: title ?? '',
      src,
    })),
  );

  try {
    await redis.set(CACHE_KEY, displayImages, { ex: CACHE_TTL_SECONDS });
  } catch {
    // Ignore cache write errors to keep request path healthy.
  }

  return displayImages;
}

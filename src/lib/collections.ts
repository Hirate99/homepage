import { prisma } from '@/lib/prisma';
import { redis } from '@/lib/redis';

export interface DisplayImage {
  tag?: string;
  src: string;
}

export interface CityPost {
  id: string;
  city: string;
  cover: string;
  images: string[];
  imageCount: number;
}

interface DBCollection {
  title: string | null;
  images: {
    src: string;
  }[];
}

const CITY_POSTS_CACHE_KEY = 'home:city-posts:v1';
const CACHE_TTL_SECONDS = 3600;

function shuffle<T>(items: T[]) {
  const copied = [...items];
  for (let i = copied.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copied[i], copied[j]] = [copied[j], copied[i]];
  }
  return copied;
}

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function parseCachedArray<T>(cached: T[] | string | null) {
  if (!cached) {
    return null;
  }
  if (Array.isArray(cached)) {
    return cached as T[];
  }

  try {
    const parsed = JSON.parse(cached);
    return Array.isArray(parsed) ? (parsed as T[]) : null;
  } catch {
    return null;
  }
}

export async function getCityPosts() {
  try {
    const cached = await redis.get<CityPost[] | string>(CITY_POSTS_CACHE_KEY);
    const cachedPosts = parseCachedArray<CityPost>(cached);
    if (cachedPosts) {
      return cachedPosts;
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

  const cityPosts = shuffle(collections)
    .map(({ images, title }, index) => {
      const validImages = images.map(({ src }) => src).filter(Boolean);
      if (!title || !validImages.length) {
        return null;
      }

      return {
        id: `${slugify(title) || 'city'}-${index}`,
        city: title,
        cover: validImages[0],
        images: validImages,
        imageCount: validImages.length,
      } satisfies CityPost;
    })
    .filter((post): post is CityPost => Boolean(post));

  try {
    await redis.set(CITY_POSTS_CACHE_KEY, cityPosts, { ex: CACHE_TTL_SECONDS });
  } catch {
    // Ignore cache write errors to keep request path healthy.
  }

  return cityPosts;
}

export async function getDisplayImages() {
  const cityPosts = await getCityPosts();

  return cityPosts.flatMap(({ city, images }) =>
    images.map((src) => ({
      tag: city,
      src,
    })),
  );
}

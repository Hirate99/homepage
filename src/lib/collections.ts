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
  coverWidth: number | null;
  coverHeight: number | null;
  images: string[];
  imageCount: number;
}

const CITY_POSTS_CACHE_KEY = 'home:city-posts:v5';
const CACHE_TTL_SECONDS = 3600;
const MAX_COVER_ASPECT_RATIO = 3 / 2;

interface CoverImage {
  id: number;
  src: string;
  width: number | null;
  height: number | null;
}

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

function isPositiveNumber(value: number | null): value is number {
  return typeof value === 'number' && value > 0;
}

function isCoverAspectAllowed(image: CoverImage) {
  if (!isPositiveNumber(image.width) || !isPositiveNumber(image.height)) {
    return false;
  }

  return image.width / image.height <= MAX_COVER_ASPECT_RATIO;
}

function getPreferredCover(images: CoverImage[], coverImageId: number | null) {
  if (typeof coverImageId !== 'number') {
    return images[0];
  }

  return images.find((image) => image.id === coverImageId) ?? images[0];
}

function pickCoverImage(images: CoverImage[], coverImageId: number | null) {
  const preferredCover = getPreferredCover(images, coverImageId);
  if (isCoverAspectAllowed(preferredCover)) {
    return preferredCover;
  }

  const firstAllowed = images.find(isCoverAspectAllowed);
  return firstAllowed ?? preferredCover;
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

  const collections = await prisma().collection.findMany({
    select: {
      title: true,
      coverImageId: true,
      images: {
        select: { id: true, src: true, width: true, height: true },
        orderBy: { id: 'asc' },
      },
    },
    where: {
      title: {
        not: null,
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  const cityPosts = shuffle(collections)
    .map(({ images, coverImageId, title }, index) => {
      const validImages = images.filter(({ src }) => Boolean(src));
      if (!title || !validImages.length) {
        return null;
      }

      const coverImage = pickCoverImage(validImages, coverImageId);

      return {
        id: `${slugify(title) || 'city'}-${index}`,
        city: title,
        cover: coverImage.src,
        coverWidth: coverImage.width,
        coverHeight: coverImage.height,
        images: validImages.map(({ src }) => src),
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

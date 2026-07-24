import type { Prisma } from '@prisma/client';

import {
  cityPostsToDisplayImages,
  mapCollectionToCityPost,
  type CityPost,
} from '@/features/collections/model/city-post';
import { prisma } from '@/lib/prisma';
import { redis } from '@/lib/redis';

const CITY_COLLECTIONS_CACHE_KEY = 'home:city-collections:v3';
const CACHE_TTL_SECONDS = 3600;

const collectionSelect = {
  title: true,
  id: true,
  coverImageId: true,
  sortOrder: true,
  locationName: true,
  country: true,
  region: true,
  latitude: true,
  longitude: true,
  description: true,
  images: {
    select: {
      id: true,
      src: true,
      width: true,
      height: true,
    },
    orderBy: { id: 'asc' },
  },
} satisfies Prisma.CollectionSelect;

type DBCollection = Prisma.CollectionGetPayload<{
  select: typeof collectionSelect;
}>;

function randomInt(max: number) {
  if (max <= 1) {
    return 0;
  }

  if (
    typeof globalThis.crypto !== 'undefined' &&
    typeof globalThis.crypto.getRandomValues === 'function'
  ) {
    const randomBuffer = new Uint32Array(1);
    globalThis.crypto.getRandomValues(randomBuffer);
    return randomBuffer[0] % max;
  }

  return Math.floor(Math.random() * max);
}

function shuffle<T>(items: T[]) {
  const copied = [...items];
  for (let i = copied.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [copied[i], copied[j]] = [copied[j], copied[i]];
  }
  return copied;
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

async function getCollectionsForPosts() {
  try {
    const cached = await redis.get<DBCollection[] | string>(
      CITY_COLLECTIONS_CACHE_KEY,
    );
    const cachedCollections = parseCachedArray<DBCollection>(cached);
    if (cachedCollections) {
      return cachedCollections;
    }
  } catch {
    // Ignore cache errors and fall through to DB query.
  }

  const collections = await prisma().collection.findMany({
    select: collectionSelect,
    where: {
      title: {
        not: null,
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  try {
    await redis.set(CITY_COLLECTIONS_CACHE_KEY, collections, {
      ex: CACHE_TTL_SECONDS,
    });
  } catch {
    // Ignore cache write errors to keep request path healthy.
  }

  return collections;
}

function isCityPost(post: CityPost | null): post is CityPost {
  return post !== null;
}

export async function getCityPosts() {
  const collections = await getCollectionsForPosts();

  return shuffle(collections).map(mapCollectionToCityPost).filter(isCityPost);
}

export async function getDisplayImages() {
  return cityPostsToDisplayImages(await getCityPosts());
}

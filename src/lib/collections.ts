import type { Prisma } from '@prisma/client';

import { prisma } from '@/lib/prisma';
import { redis } from '@/lib/redis';

export interface PlaceMetadata {
  order: number;
  locationName: string;
  country: string;
  region: string;
  latitude: number;
  longitude: number;
  description: string;
}

export interface DisplayImage {
  tag?: string;
  src: string;
}

export interface CityPost {
  id: string;
  collectionId: number;
  slug: string;
  city: string;
  cover: string;
  coverWidth: number | null;
  coverHeight: number | null;
  images: string[];
  imageCount: number;
  sortOrder: number;
  location: PlaceMetadata | null;
}

const CITY_COLLECTIONS_CACHE_KEY = 'home:city-collections:v3';
const CACHE_TTL_SECONDS = 3600;
const MIN_HORIZONTAL_COVER_RATIO = 16 / 9;
const MIN_VERTICAL_COVER_RATIO = 1 / 2;

interface CoverImage {
  id: number;
  src: string;
  width: number | null;
  height: number | null;
}

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

  const ratio = image.width / image.height;
  if (image.width > image.height) {
    return ratio >= MIN_HORIZONTAL_COVER_RATIO;
  }
  if (image.height > image.width) {
    return ratio >= MIN_VERTICAL_COVER_RATIO;
  }
  return true;
}

function getPreferredCover(images: CoverImage[], coverImageId: number | null) {
  if (typeof coverImageId !== 'number') {
    return images[0];
  }

  return images.find((image) => image.id === coverImageId) ?? images[0];
}

function pickCoverImage(images: CoverImage[], coverImageId: number | null) {
  const preferredCover = getPreferredCover(images, coverImageId);
  if (preferredCover && isCoverAspectAllowed(preferredCover)) {
    return preferredCover;
  }

  const firstEligibleCover = images.find(isCoverAspectAllowed);
  if (firstEligibleCover) {
    return firstEligibleCover;
  }

  return preferredCover;
}

function buildLocationMetadata({
  sortOrder,
  locationName,
  country,
  region,
  latitude,
  longitude,
  description,
}: Pick<
  DBCollection,
  | 'sortOrder'
  | 'locationName'
  | 'country'
  | 'region'
  | 'latitude'
  | 'longitude'
  | 'description'
>) {
  if (
    !locationName ||
    !country ||
    !region ||
    typeof latitude !== 'number' ||
    typeof longitude !== 'number'
  ) {
    return null;
  }

  return {
    order: sortOrder ?? Number.MAX_SAFE_INTEGER,
    locationName,
    country,
    region,
    latitude,
    longitude,
    description: description ?? '',
  } satisfies PlaceMetadata;
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

export async function getCityPosts() {
  const collections = await getCollectionsForPosts();

  const cityPosts = shuffle(collections)
    .map<CityPost | null>((collection) => {
      const {
        id,
        title,
        images,
        coverImageId,
        sortOrder,
        locationName,
        country,
        region,
        latitude,
        longitude,
        description,
      } = collection;
      const validImages = images.filter(({ src }) => Boolean(src));
      if (!title || !validImages.length) {
        return null;
      }

      const coverImage = pickCoverImage(validImages, coverImageId);
      const location = buildLocationMetadata({
        sortOrder,
        locationName,
        country,
        region,
        latitude,
        longitude,
        description,
      });

      return {
        id: id.toString(),
        collectionId: id,
        slug: slugify(title) || `collection-${id}`,
        city: title,
        cover: coverImage.src,
        coverWidth: coverImage.width,
        coverHeight: coverImage.height,
        images: validImages.map(({ src }) => src),
        imageCount: validImages.length,
        sortOrder: location?.order ?? Number.MAX_SAFE_INTEGER,
        location,
      };
    })
    .filter((post): post is CityPost => Boolean(post));

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

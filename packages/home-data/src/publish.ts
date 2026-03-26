import type {
  LocationDraft,
  PublishCollectionInput,
  PublishCollectionResult,
} from './types';

import { extractGpsFromImage } from './exif';
import { reverseGeocodeLocation } from './geocode';
import { convertImageToWebp } from './media';
import { prisma } from './prisma';
import { redis } from './redis';
import { uploadWebpToR2 } from './r2';

const HOME_COLLECTIONS_CACHE_KEY = 'home:city-collections:v3';

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function normalizeText(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function normalizeNumber(value: number | null | undefined) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

async function invalidateCollectionsCache() {
  const client = redis();
  if (!client) {
    return;
  }

  try {
    await client.del(HOME_COLLECTIONS_CACHE_KEY);
  } catch {
    // Ignore cache errors so publishing still succeeds.
  }
}

async function detectLocation(images: PublishCollectionInput['images']) {
  for (const image of images) {
    const gps = await extractGpsFromImage(image);
    if (!gps) {
      continue;
    }

    return reverseGeocodeLocation(gps.latitude, gps.longitude);
  }

  return null;
}

function mergeLocation(
  manual: Partial<LocationDraft> | undefined,
  detected: LocationDraft | null,
): LocationDraft | null {
  const hasManualValue = Boolean(
    manual &&
      [
        manual.latitude,
        manual.longitude,
        manual.locationName,
        manual.country,
        manual.region,
        manual.description,
      ].some((value) => value !== undefined && value !== null && value !== ''),
  );
  const latitude =
    normalizeNumber(manual?.latitude) ?? detected?.latitude ?? null;
  const longitude =
    normalizeNumber(manual?.longitude) ?? detected?.longitude ?? null;
  const locationName =
    normalizeText(manual?.locationName) ?? detected?.locationName ?? '';
  const country = normalizeText(manual?.country) ?? detected?.country ?? '';
  const region = normalizeText(manual?.region) ?? detected?.region ?? '';
  const description =
    normalizeText(manual?.description) ?? detected?.description ?? '';

  const hasAnyValue = [
    latitude,
    longitude,
    locationName,
    country,
    region,
    description,
  ].some((value) => value !== null && value !== '');

  if (!hasAnyValue) {
    return null;
  }

  return {
    latitude,
    longitude,
    locationName,
    country,
    region,
    description,
    source: hasManualValue ? 'manual' : (detected?.source ?? 'none'),
  };
}

export async function getLocationHint(
  images: PublishCollectionInput['images'],
): Promise<LocationDraft | null> {
  return detectLocation(images);
}

export async function publishCollection(
  input: PublishCollectionInput,
): Promise<PublishCollectionResult> {
  const title = input.title.trim();
  if (!title) {
    throw new Error('Title is required.');
  }

  if (!input.images.length) {
    throw new Error('At least one image is required.');
  }

  const detectedLocation = await detectLocation(input.images);
  const effectiveLocation = mergeLocation(input.location, detectedLocation);
  const slug = slugify(title) || `collection-${Date.now()}`;
  const processedImages = await Promise.all(
    input.images.map(async (image, index) => {
      const converted = await convertImageToWebp(image);
      const key = `collections/${slug}/${Date.now()}-${index}-${crypto.randomUUID()}-${converted.keyBase}.webp`;
      const url = await uploadWebpToR2(key, converted.output);

      return {
        src: url,
        width: converted.width,
        height: converted.height,
      };
    }),
  );

  const safeCoverIndex =
    typeof input.coverIndex === 'number' &&
    input.coverIndex >= 0 &&
    input.coverIndex < processedImages.length
      ? input.coverIndex
      : 0;

  const client = prisma();

  try {
    const collection = await client.collection.create({
      data: {
        title,
        content: normalizeText(input.content),
        sortOrder: normalizeNumber(input.sortOrder),
        locationName: normalizeText(
          effectiveLocation?.locationName ?? undefined,
        ),
        country: normalizeText(effectiveLocation?.country ?? undefined),
        region: normalizeText(effectiveLocation?.region ?? undefined),
        latitude: normalizeNumber(effectiveLocation?.latitude),
        longitude: normalizeNumber(effectiveLocation?.longitude),
        description: normalizeText(effectiveLocation?.description ?? undefined),
      },
    });

    const createdImages = [];
    for (const image of processedImages) {
      const createdImage = await client.image.create({
        data: {
          src: image.src,
          width: image.width,
          height: image.height,
          collectionId: collection.id,
        },
      });
      createdImages.push(createdImage);
    }

    const coverImage =
      createdImages[safeCoverIndex] ?? createdImages[0] ?? null;
    if (coverImage) {
      await client.collection.update({
        where: { id: collection.id },
        data: { coverImageId: coverImage.id },
      });
    }

    await invalidateCollectionsCache();

    return {
      collectionId: collection.id,
      coverImageId: coverImage?.id ?? null,
      uploadedCount: createdImages.length,
      imageUrls: createdImages.map((image) => image.src),
      location: effectiveLocation,
    };
  } finally {
    await client.$disconnect();
  }
}

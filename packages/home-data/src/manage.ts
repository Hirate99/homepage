import { convertImageToWebp } from './media';
import { getR2Env } from './env';
import { createCollectionImageObjectKey } from './object-key';
import { deleteObjectFromR2 } from './r2';
import { uploadWebpToR2 } from './r2';
import type {
  AdminCollectionRecord,
  LocationDraft,
  UpdateCollectionInput,
  UploadedImageInput,
} from './types';
import { prisma } from './prisma';
import { redis } from './redis';

const HOME_COLLECTIONS_CACHE_KEY = 'home:city-collections:v3';

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
    // Ignore cache errors so writes still succeed.
  }
}

function mergeLocation(manual: Partial<LocationDraft> | undefined) {
  return {
    locationName: normalizeText(manual?.locationName),
    country: normalizeText(manual?.country),
    region: normalizeText(manual?.region),
    latitude: normalizeNumber(manual?.latitude),
    longitude: normalizeNumber(manual?.longitude),
    description: normalizeText(manual?.description),
  };
}

function serializeCollection(collection: {
  id: number;
  title: string | null;
  content: string | null;
  sortOrder: number | null;
  locationName: string | null;
  country: string | null;
  region: string | null;
  latitude: number | null;
  longitude: number | null;
  description: string | null;
  coverImageId: number | null;
  createdAt: Date;
  updatedAt: Date;
  images: Array<{
    id: number;
    src: string;
    width: number | null;
    height: number | null;
  }>;
}): AdminCollectionRecord {
  return {
    id: collection.id,
    title: collection.title ?? '',
    content: collection.content,
    sortOrder: collection.sortOrder,
    locationName: collection.locationName,
    country: collection.country,
    region: collection.region,
    latitude: collection.latitude,
    longitude: collection.longitude,
    description: collection.description,
    coverImageId: collection.coverImageId,
    images: collection.images,
    createdAt: collection.createdAt.toISOString(),
    updatedAt: collection.updatedAt.toISOString(),
  };
}

const adminCollectionSelect = {
  id: true,
  title: true,
  content: true,
  sortOrder: true,
  locationName: true,
  country: true,
  region: true,
  latitude: true,
  longitude: true,
  description: true,
  coverImageId: true,
  createdAt: true,
  updatedAt: true,
  images: {
    select: {
      id: true,
      src: true,
      width: true,
      height: true,
    },
    orderBy: { id: 'asc' as const },
  },
};

async function getAdminCollectionById(collectionId: number) {
  const client = prisma();

  try {
    const collection = await client.collection.findUnique({
      where: { id: collectionId },
      select: adminCollectionSelect,
    });

    return collection ? serializeCollection(collection) : null;
  } finally {
    await client.$disconnect();
  }
}

export async function listCollectionsForAdmin(): Promise<
  AdminCollectionRecord[]
> {
  const client = prisma();

  try {
    const collections = await client.collection.findMany({
      select: adminCollectionSelect,
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
    });

    return collections.map(serializeCollection);
  } finally {
    await client.$disconnect();
  }
}

export async function updateCollection(
  input: UpdateCollectionInput,
): Promise<AdminCollectionRecord> {
  const title = input.title.trim();
  if (!title) {
    throw new Error('Title is required.');
  }

  const client = prisma();

  try {
    const updated = await client.collection.update({
      where: { id: input.collectionId },
      data: {
        title,
        content: normalizeText(input.content),
        sortOrder: normalizeNumber(input.sortOrder),
        coverImageId:
          typeof input.coverImageId === 'number' ? input.coverImageId : null,
        ...mergeLocation(input.location),
      },
      select: adminCollectionSelect,
    });

    await invalidateCollectionsCache();
    return serializeCollection(updated);
  } finally {
    await client.$disconnect();
  }
}

function extractR2Key(url: string) {
  const publicBaseUrl = getR2Env().publicBaseUrl.replace(/\/$/, '');
  if (!url.startsWith(publicBaseUrl)) {
    return null;
  }

  return url.slice(publicBaseUrl.length + 1);
}

export async function appendImagesToCollection(
  collectionId: number,
  images: UploadedImageInput[],
) {
  if (!images.length) {
    throw new Error('At least one image is required.');
  }

  const client = prisma();

  try {
    const collection = await client.collection.findUnique({
      where: { id: collectionId },
      select: {
        id: true,
        title: true,
        locationName: true,
        coverImageId: true,
      },
    });

    if (!collection) {
      throw new Error('Collection not found.');
    }

    const uploaded = [];
    const folderInput = collection.locationName ?? collection.title;

    for (const image of images) {
      const converted = await convertImageToWebp(image);
      const key = createCollectionImageObjectKey(folderInput);
      const url = await uploadWebpToR2(key, converted.output);
      uploaded.push({
        src: url,
        width: converted.width,
        height: converted.height,
      });
    }

    const createdImages = [];
    for (const image of uploaded) {
      const createdImage = await client.image.create({
        data: {
          src: image.src,
          width: image.width,
          height: image.height,
          collectionId,
        },
      });
      createdImages.push(createdImage);
    }

    if (!collection.coverImageId && createdImages[0]) {
      await client.collection.update({
        where: { id: collectionId },
        data: { coverImageId: createdImages[0].id },
      });
    }

    await invalidateCollectionsCache();
  } finally {
    await client.$disconnect();
  }

  const updated = await getAdminCollectionById(collectionId);
  if (!updated) {
    throw new Error('Collection not found after upload.');
  }

  return updated;
}

export async function deleteImageFromCollection(
  collectionId: number,
  imageId: number,
) {
  const client = prisma();
  let imageSrc: string | null = null;

  try {
    const image = await client.image.findFirst({
      where: {
        id: imageId,
        collectionId,
      },
      select: {
        id: true,
        src: true,
      },
    });

    if (!image) {
      throw new Error('Image not found.');
    }

    imageSrc = image.src;

    const collection = await client.collection.findUnique({
      where: { id: collectionId },
      select: {
        id: true,
        coverImageId: true,
        images: {
          select: { id: true },
          orderBy: { id: 'asc' },
        },
      },
    });

    if (!collection) {
      throw new Error('Collection not found.');
    }

    await client.image.delete({
      where: { id: imageId },
    });

    if (collection.coverImageId === imageId) {
      const nextCover = collection.images.find((item) => item.id !== imageId);
      await client.collection.update({
        where: { id: collectionId },
        data: {
          coverImageId: nextCover?.id ?? null,
        },
      });
    }

    await invalidateCollectionsCache();
  } finally {
    await client.$disconnect();
  }

  if (imageSrc) {
    const key = extractR2Key(imageSrc);
    if (key) {
      await deleteObjectFromR2(key);
    }
  }

  const updated = await getAdminCollectionById(collectionId);
  if (!updated) {
    throw new Error('Collection not found after delete.');
  }

  return updated;
}

export async function deleteCollection(collectionId: number) {
  const client = prisma();

  try {
    const collection = await client.collection.findUnique({
      where: { id: collectionId },
      select: {
        id: true,
        images: {
          select: {
            id: true,
            src: true,
          },
        },
      },
    });

    if (!collection) {
      throw new Error('Collection not found.');
    }

    await client.image.deleteMany({
      where: { collectionId },
    });

    await client.collection.delete({
      where: { id: collectionId },
    });

    await invalidateCollectionsCache();

    await Promise.allSettled(
      collection.images.map(async (image) => {
        const key = extractR2Key(image.src);
        if (!key) {
          return;
        }

        await deleteObjectFromR2(key);
      }),
    );
  } finally {
    await client.$disconnect();
  }
}

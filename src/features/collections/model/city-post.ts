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

export interface CollectionPostImage {
  id: number;
  src: string;
  width: number | null;
  height: number | null;
}

export interface CollectionPostSource {
  id: number;
  title: string | null;
  coverImageId: number | null;
  sortOrder: number | null;
  locationName: string | null;
  country: string | null;
  region: string | null;
  latitude: number | null;
  longitude: number | null;
  description: string | null;
  images: CollectionPostImage[];
}

const MIN_HORIZONTAL_COVER_RATIO = 16 / 9;
const MIN_VERTICAL_COVER_RATIO = 1 / 2;

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function isPositiveNumber(value: number | null): value is number {
  return typeof value === 'number' && value > 0;
}

function isCoverAspectAllowed(image: CollectionPostImage) {
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

export function selectCoverImage(
  images: CollectionPostImage[],
  coverImageId: number | null,
) {
  const preferredCover =
    typeof coverImageId === 'number'
      ? (images.find((image) => image.id === coverImageId) ?? images[0])
      : images[0];

  if (preferredCover && isCoverAspectAllowed(preferredCover)) {
    return preferredCover;
  }

  return images.find(isCoverAspectAllowed) ?? preferredCover;
}

function buildLocationMetadata(
  collection: CollectionPostSource,
): PlaceMetadata | null {
  const {
    sortOrder,
    locationName,
    country,
    region,
    latitude,
    longitude,
    description,
  } = collection;

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
  };
}

export function mapCollectionToCityPost(
  collection: CollectionPostSource,
): CityPost | null {
  const { id, title, images, coverImageId } = collection;
  const validImages = images.filter(({ src }) => Boolean(src));
  if (!title || !validImages.length) {
    return null;
  }

  const coverImage = selectCoverImage(validImages, coverImageId);
  if (!coverImage) {
    return null;
  }

  const location = buildLocationMetadata(collection);

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
}

export function cityPostsToDisplayImages(posts: CityPost[]): DisplayImage[] {
  return posts.flatMap(({ city, images }) =>
    images.map((src) => ({
      tag: city,
      src,
    })),
  );
}

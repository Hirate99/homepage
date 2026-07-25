import type { CityPost } from '@/features/collections/model/city-post';

export type ZoomTier = 'world' | 'region' | 'place';

export interface LocationNode {
  kind: 'location';
  id: string;
  label: string;
  country: string;
  region: string;
  lat: number;
  lng: number;
  count: number;
  posts: CityPost[];
  cover: string;
}

export interface CountryNode {
  kind: 'country';
  id: string;
  label: string;
  lat: number;
  lng: number;
  count: number;
  postCount: number;
  locations: LocationNode[];
  cover: string;
}

export type MarkerNode = CountryNode | LocationNode;

export const ZOOM_SCALE = {
  world: 0.9,
  region: 2.72,
} as const;
export const MIN_GLOBE_SCALE = 0.84;
export const MAX_GLOBE_SCALE = 4.42;
export const COUNTRY_ENTRY_SCALE = 3.45;

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function sortPosts(posts: CityPost[]) {
  return [...posts].sort((left, right) => {
    if (left.sortOrder !== right.sortOrder) {
      return left.sortOrder - right.sortOrder;
    }

    return left.city.localeCompare(right.city);
  });
}

function normalizeLocationName(value: string) {
  return value
    .normalize('NFKC')
    .trim()
    .toLocaleLowerCase()
    .replace(/\s+/g, ' ');
}

function getLocationCoordinateKey(post: CityPost) {
  if (!post.location) {
    return '';
  }

  return [
    normalizeLocationName(post.location.country),
    post.location.latitude.toFixed(4),
    post.location.longitude.toFixed(4),
  ].join(':');
}

function averageCoordinates(points: Array<{ lat: number; lng: number }>) {
  const total = points.reduce(
    (acc, point) => ({
      lat: acc.lat + point.lat,
      lng: acc.lng + point.lng,
    }),
    { lat: 0, lng: 0 },
  );

  return {
    lat: total.lat / points.length,
    lng: total.lng / points.length,
  };
}

export function buildLocationNodes(posts: CityPost[]) {
  const groups: LocationNode[] = [];
  const groupsByName = new Map<string, LocationNode>();
  const groupsByCoordinates = new Map<string, LocationNode>();

  for (const post of posts) {
    if (!post.location) {
      continue;
    }

    const nameKey = [
      normalizeLocationName(post.location.country),
      normalizeLocationName(post.location.locationName),
    ].join(':');
    const coordinateKey = getLocationCoordinateKey(post);
    const existing =
      groupsByName.get(nameKey) ?? groupsByCoordinates.get(coordinateKey);

    if (existing) {
      existing.posts.push(post);
      existing.count += 1;
      groupsByName.set(nameKey, existing);
      groupsByCoordinates.set(coordinateKey, existing);
      continue;
    }

    const node: LocationNode = {
      kind: 'location',
      id: `location-${nameKey.replace(/[^a-z0-9]+/g, '-')}`,
      label: post.location.locationName,
      country: post.location.country,
      region: post.location.region,
      lat: post.location.latitude,
      lng: post.location.longitude,
      count: 1,
      posts: [post],
      cover: post.cover,
    };
    groups.push(node);
    groupsByName.set(nameKey, node);
    groupsByCoordinates.set(coordinateKey, node);
  }

  return groups.sort((left, right) => left.label.localeCompare(right.label));
}

export function buildCountryNodes(locations: LocationNode[]) {
  const groups = new Map<string, CountryNode>();

  for (const location of locations) {
    const existing = groups.get(location.country);

    if (existing) {
      existing.locations.push(location);
      existing.count += 1;
      existing.postCount += location.posts.length;
      const average = averageCoordinates(
        existing.locations.map((item) => ({ lat: item.lat, lng: item.lng })),
      );
      existing.lat = average.lat;
      existing.lng = average.lng;
      continue;
    }

    groups.set(location.country, {
      kind: 'country',
      id: `country-${location.country.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      label: location.country,
      lat: location.lat,
      lng: location.lng,
      count: 1,
      postCount: location.posts.length,
      locations: [location],
      cover: location.cover,
    });
  }

  return [...groups.values()].sort((left, right) =>
    left.label.localeCompare(right.label),
  );
}

export function latLngToXYZ(lat: number, lng: number) {
  const latRadians = (lat * Math.PI) / 180;
  const lngRadians = (lng * Math.PI) / 180 - Math.PI;
  const cosLat = Math.cos(latRadians);

  return [
    -cosLat * Math.cos(lngRadians),
    Math.sin(latRadians),
    cosLat * Math.sin(lngRadians),
  ] as const;
}

export function getCenteredNodeId(
  projectedNodes: Array<{
    node: MarkerNode;
    position: { x: number; y: number; visible: boolean };
  }>,
  currentId: string | null,
) {
  const visibleNodes = projectedNodes
    .filter(({ position }) => position.visible)
    .map(({ node, position }) => ({
      id: node.id,
      distance: Math.hypot(position.x - 0.5, position.y - 0.5),
    }))
    .sort((left, right) => left.distance - right.distance);

  const nearest = visibleNodes[0];
  if (!nearest) {
    return currentId;
  }

  const current = currentId
    ? (visibleNodes.find((item) => item.id === currentId) ?? null)
    : null;

  if (!current) {
    return nearest.id;
  }

  if (current.distance > 0.16) {
    return nearest.id;
  }

  if (
    nearest.id !== current.id &&
    nearest.distance + 0.035 < current.distance
  ) {
    return nearest.id;
  }

  return current.id;
}

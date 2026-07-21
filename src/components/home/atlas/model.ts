import type { CityPost } from '@/lib/collections';

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

export interface PostNode {
  kind: 'post';
  id: string;
  label: string;
  country: string;
  region: string;
  lat: number;
  lng: number;
  count: number;
  post: CityPost;
  cover: string;
}

export type MarkerNode = CountryNode | LocationNode | PostNode;

export const ZOOM_SCALE: Record<ZoomTier, number> = {
  world: 0.9,
  region: 2.72,
  place: 3.78,
};
export const MIN_GLOBE_SCALE = 0.84;
export const MAX_GLOBE_SCALE = 4.42;

const REGION_ZOOM_THRESHOLD = 1.62;
const PLACE_ZOOM_THRESHOLD = ZOOM_SCALE.place;

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

export function getZoomTier(scale: number): ZoomTier {
  if (scale < REGION_ZOOM_THRESHOLD) {
    return 'world';
  }

  if (scale < PLACE_ZOOM_THRESHOLD) {
    return 'region';
  }

  return 'place';
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
  const groups = new Map<string, LocationNode>();

  for (const post of posts) {
    if (!post.location) {
      continue;
    }

    const key = `${post.location.country}:${post.location.locationName}`;
    const existing = groups.get(key);

    if (existing) {
      existing.posts.push(post);
      existing.count += 1;
      continue;
    }

    groups.set(key, {
      kind: 'location',
      id: `location-${key.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      label: post.location.locationName,
      country: post.location.country,
      region: post.location.region,
      lat: post.location.latitude,
      lng: post.location.longitude,
      count: 1,
      posts: [post],
      cover: post.cover,
    });
  }

  return [...groups.values()].sort((left, right) =>
    left.label.localeCompare(right.label),
  );
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

function wrapLongitude(lng: number) {
  return ((lng + 540) % 360) - 180;
}

function offsetCoordinates(
  lat: number,
  lng: number,
  index: number,
  total: number,
) {
  if (total <= 1) {
    return { lat, lng };
  }

  const angle = (Math.PI * 2 * index) / total - Math.PI / 2;
  const radius = 1.35 + Math.floor(index / 6) * 0.55;
  const latOffset = Math.sin(angle) * radius;
  const lngOffset =
    (Math.cos(angle) * radius) /
    Math.max(Math.cos((lat * Math.PI) / 180), 0.35);

  return {
    lat: clamp(lat + latOffset, -85, 85),
    lng: wrapLongitude(lng + lngOffset),
  };
}

function buildPostNodes(location: LocationNode): PostNode[] {
  return location.posts.map<PostNode>((post, index) => {
    const coords = offsetCoordinates(
      location.lat,
      location.lng,
      index,
      location.posts.length,
    );

    return {
      kind: 'post',
      id: `post-${post.id}`,
      label: post.location?.locationName ?? post.city,
      country: location.country,
      region: location.region,
      lat: coords.lat,
      lng: coords.lng,
      count: 1,
      post,
      cover: post.cover,
    };
  });
}

export function buildAllPostNodes(locations: LocationNode[]) {
  return locations.flatMap(buildPostNodes);
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

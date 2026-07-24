import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { CityPost } from '@/features/collections/model/city-post';

import {
  buildAllPostNodes,
  buildCountryNodes,
  buildLocationNodes,
  getCenteredNodeId,
  getZoomTier,
  MAX_GLOBE_SCALE,
  MIN_GLOBE_SCALE,
} from './atlas';
import {
  getGlobeView,
  getMarkerLabelTransform,
  globeScaleToAltitude,
  isNodeVisibleFromView,
} from './globe-view';

function createPost(
  id: string,
  location: CityPost['location'],
  sortOrder = 0,
): CityPost {
  return {
    id,
    collectionId: Number(id),
    slug: `post-${id}`,
    city: `City ${id}`,
    cover: `https://example.com/${id}.webp`,
    coverWidth: 1600,
    coverHeight: 900,
    images: [`https://example.com/${id}.webp`],
    imageCount: 1,
    sortOrder,
    location,
  };
}

describe('Atlas node model', () => {
  it('groups posts into locations and countries while ignoring unmapped posts', () => {
    const posts = [
      createPost('1', {
        order: 1,
        locationName: 'Los Angeles',
        country: 'United States',
        region: 'California',
        latitude: 34,
        longitude: -118,
        description: '',
      }),
      createPost('2', {
        order: 2,
        locationName: 'Los Angeles',
        country: 'United States',
        region: 'California',
        latitude: 34,
        longitude: -118,
        description: '',
      }),
      createPost('3', {
        order: 3,
        locationName: 'Chicago',
        country: 'United States',
        region: 'Illinois',
        latitude: 41.88,
        longitude: -87.63,
        description: '',
      }),
      createPost('4', null),
    ];

    const locations = buildLocationNodes(posts);
    const countries = buildCountryNodes(locations);

    assert.equal(locations.length, 2);
    assert.equal(
      locations.find((location) => location.label === 'Los Angeles')?.count,
      2,
    );
    assert.equal(countries.length, 1);
    assert.equal(countries[0].count, 2);
    assert.equal(countries[0].postCount, 3);
  });

  it('offsets multiple post markers that share one location', () => {
    const location = buildLocationNodes([
      createPost('1', {
        order: 1,
        locationName: 'Tokyo',
        country: 'Japan',
        region: 'Tokyo',
        latitude: 35.68,
        longitude: 139.76,
        description: '',
      }),
      createPost('2', {
        order: 2,
        locationName: 'Tokyo',
        country: 'Japan',
        region: 'Tokyo',
        latitude: 35.68,
        longitude: 139.76,
        description: '',
      }),
    ])[0];

    const nodes = buildAllPostNodes([location]);

    assert.equal(nodes.length, 2);
    assert.notDeepEqual(
      { lat: nodes[0].lat, lng: nodes[0].lng },
      { lat: nodes[1].lat, lng: nodes[1].lng },
    );
  });

  it('preserves the centered marker until a replacement is meaningfully closer', () => {
    const [current, candidate] = buildLocationNodes([
      createPost('1', {
        order: 1,
        locationName: 'Current',
        country: 'Test',
        region: 'Test',
        latitude: 0,
        longitude: 0,
        description: '',
      }),
      createPost('2', {
        order: 2,
        locationName: 'Candidate',
        country: 'Test',
        region: 'Test',
        latitude: 1,
        longitude: 1,
        description: '',
      }),
    ]);

    assert.equal(
      getCenteredNodeId(
        [
          {
            node: current,
            position: { x: 0.55, y: 0.5, visible: true },
          },
          {
            node: candidate,
            position: { x: 0.53, y: 0.5, visible: true },
          },
        ],
        current.id,
      ),
      current.id,
    );
  });
});

describe('Atlas globe view model', () => {
  it('maps zoom scale to the supported altitude and zoom tiers', () => {
    assert.equal(globeScaleToAltitude(MIN_GLOBE_SCALE - 1), 2.2);
    assert.ok(
      Math.abs(globeScaleToAltitude(MAX_GLOBE_SCALE + 1) - 0.6) <
        Number.EPSILON,
    );
    assert.equal(getZoomTier(1), 'world');
    assert.equal(getZoomTier(2), 'region');
    assert.equal(getZoomTier(4), 'place');
    assert.deepEqual(getGlobeView(12, 34, MIN_GLOBE_SCALE), {
      lat: 12,
      lng: 34,
      altitude: 2.2,
    });
  });

  it('detects front-facing nodes and chooses label offsets by screen edge', () => {
    assert.equal(
      isNodeVisibleFromView({ lat: 0, lng: 0 }, { lat: 0, lng: 0 }),
      true,
    );
    assert.equal(
      isNodeVisibleFromView({ lat: 0, lng: 180 }, { lat: 0, lng: 0 }),
      false,
    );
    assert.equal(
      getMarkerLabelTransform({ x: 0.8, y: 0.5 }),
      'translate(calc(-100% - 18px), -50%)',
    );
    assert.equal(
      getMarkerLabelTransform({ x: 0.5, y: 0.8 }),
      'translate(-50%, calc(-100% - 18px))',
    );
  });
});

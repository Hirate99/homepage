import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  cityPostsToDisplayImages,
  mapCollectionToCityPost,
  selectCoverImage,
  type CollectionPostSource,
} from './city-post';

function createCollection(
  overrides: Partial<CollectionPostSource> = {},
): CollectionPostSource {
  return {
    id: 42,
    title: 'Los Angeles',
    coverImageId: 2,
    sortOrder: 3,
    locationName: 'Los Angeles',
    country: 'United States',
    region: 'California',
    latitude: 34.0522,
    longitude: -118.2437,
    description: 'City of light.',
    images: [
      {
        id: 1,
        src: 'https://example.com/portrait.webp',
        width: 800,
        height: 1200,
      },
      {
        id: 2,
        src: 'https://example.com/landscape.webp',
        width: 1600,
        height: 900,
      },
    ],
    ...overrides,
  };
}

describe('selectCoverImage', () => {
  it('uses the configured cover when its aspect ratio is eligible', () => {
    const collection = createCollection();

    assert.equal(
      selectCoverImage(collection.images, collection.coverImageId)?.id,
      2,
    );
  });

  it('falls back to the first eligible image when the configured cover is too narrow', () => {
    const collection = createCollection({
      coverImageId: 1,
      images: [
        {
          id: 1,
          src: 'https://example.com/narrow.webp',
          width: 1200,
          height: 1000,
        },
        {
          id: 2,
          src: 'https://example.com/wide.webp',
          width: 1600,
          height: 900,
        },
      ],
    });

    assert.equal(
      selectCoverImage(collection.images, collection.coverImageId)?.id,
      2,
    );
  });
});

describe('mapCollectionToCityPost', () => {
  it('maps the persisted collection into the UI read model', () => {
    const post = mapCollectionToCityPost(createCollection());

    assert.deepEqual(post, {
      id: '42',
      collectionId: 42,
      slug: 'los-angeles',
      city: 'Los Angeles',
      cover: 'https://example.com/landscape.webp',
      coverWidth: 1600,
      coverHeight: 900,
      images: [
        'https://example.com/portrait.webp',
        'https://example.com/landscape.webp',
      ],
      imageCount: 2,
      sortOrder: 3,
      location: {
        order: 3,
        locationName: 'Los Angeles',
        country: 'United States',
        region: 'California',
        latitude: 34.0522,
        longitude: -118.2437,
        description: 'City of light.',
      },
    });
  });

  it('omits incomplete location metadata and retains a stable fallback slug', () => {
    const post = mapCollectionToCityPost(
      createCollection({
        title: '東京',
        region: null,
      }),
    );

    assert.equal(post?.slug, 'collection-42');
    assert.equal(post?.location, null);
    assert.equal(post?.sortOrder, Number.MAX_SAFE_INTEGER);
  });

  it('rejects collections without a title or usable image', () => {
    assert.equal(
      mapCollectionToCityPost(createCollection({ title: null })),
      null,
    );
    assert.equal(
      mapCollectionToCityPost(
        createCollection({
          images: [
            {
              id: 1,
              src: '',
              width: 1600,
              height: 900,
            },
          ],
        }),
      ),
      null,
    );
  });
});

describe('cityPostsToDisplayImages', () => {
  it('flattens posts into tagged display images', () => {
    const post = mapCollectionToCityPost(createCollection());
    assert.ok(post);

    assert.deepEqual(cityPostsToDisplayImages([post]), [
      {
        tag: 'Los Angeles',
        src: 'https://example.com/portrait.webp',
      },
      {
        tag: 'Los Angeles',
        src: 'https://example.com/landscape.webp',
      },
    ]);
  });
});

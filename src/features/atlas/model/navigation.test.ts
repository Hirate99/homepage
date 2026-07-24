import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { MAX_GLOBE_SCALE, ZOOM_SCALE } from './atlas';
import {
  atlasNavigationReducer,
  createAtlasNavigationState,
} from './navigation';

const initialSelection = {
  countryId: 'country-japan',
  locationId: 'location-tokyo',
  postId: '1',
};

describe('atlasNavigationReducer', () => {
  it('creates a world-level state focused on the initial country', () => {
    assert.deepEqual(createAtlasNavigationState(initialSelection), {
      zoomScale: ZOOM_SCALE.world,
      selectedCountryId: 'country-japan',
      selectedLocationId: 'location-tokyo',
      activePostId: '1',
      cameraTargetId: 'country-japan',
      cameraFocusKey: 0,
      isAutoRotateFrozen: false,
      displayZoomTier: 'world',
    });
  });

  it('selects a country as one atomic transition', () => {
    const state = atlasNavigationReducer(
      createAtlasNavigationState(initialSelection),
      {
        type: 'select_country',
        countryId: 'country-us',
        locationId: 'location-chicago',
        postId: '2',
        freezeRotation: true,
      },
    );

    assert.equal(state.selectedCountryId, 'country-us');
    assert.equal(state.selectedLocationId, 'location-chicago');
    assert.equal(state.activePostId, '2');
    assert.equal(state.cameraTargetId, 'country-us');
    assert.equal(state.cameraFocusKey, 1);
    assert.equal(state.displayZoomTier, 'region');
    assert.equal(state.zoomScale, ZOOM_SCALE.region);
    assert.equal(state.isAutoRotateFrozen, true);
  });

  it('clamps zoom changes to the supported range', () => {
    const state = atlasNavigationReducer(
      createAtlasNavigationState(initialSelection),
      {
        type: 'set_zoom',
        value: MAX_GLOBE_SCALE + 100,
      },
    );

    assert.equal(state.zoomScale, MAX_GLOBE_SCALE);
  });

  it('evaluates zoom updater functions against the latest reducer state', () => {
    const state = atlasNavigationReducer(
      {
        ...createAtlasNavigationState(initialSelection),
        zoomScale: 2,
      },
      {
        type: 'set_zoom',
        value: (current) => current * 1.5,
      },
    );

    assert.equal(state.zoomScale, 3);
  });

  it('repairs invalid selections when available nodes change', () => {
    const staleState = {
      ...createAtlasNavigationState(initialSelection),
      selectedCountryId: 'country-missing',
      selectedLocationId: 'location-missing',
      activePostId: 'missing',
      cameraTargetId: 'post-missing',
    };

    const state = atlasNavigationReducer(staleState, {
      type: 'sync',
      countryIds: ['country-us'],
      locationIds: ['location-chicago'],
      postIds: ['2'],
      fallback: {
        countryId: 'country-us',
        locationId: 'location-chicago',
        postId: '2',
      },
    });

    assert.equal(state.selectedCountryId, 'country-us');
    assert.equal(state.selectedLocationId, 'location-chicago');
    assert.equal(state.activePostId, '2');
    assert.equal(state.cameraTargetId, 'country-us');
  });

  it('centers passive selection without changing camera or zoom state', () => {
    const initial = createAtlasNavigationState(initialSelection);
    const state = atlasNavigationReducer(initial, {
      type: 'center_selection',
      locationId: 'location-osaka',
      postId: '3',
    });

    assert.equal(state.selectedCountryId, initial.selectedCountryId);
    assert.equal(state.selectedLocationId, 'location-osaka');
    assert.equal(state.activePostId, '3');
    assert.equal(state.cameraTargetId, initial.cameraTargetId);
    assert.equal(state.cameraFocusKey, initial.cameraFocusKey);
    assert.equal(state.zoomScale, initial.zoomScale);
  });

  it('resets navigation while advancing the camera focus key', () => {
    const state = atlasNavigationReducer(
      {
        ...createAtlasNavigationState(initialSelection),
        cameraFocusKey: 4,
        isAutoRotateFrozen: true,
        displayZoomTier: 'place',
      },
      {
        type: 'reset',
        selection: {
          countryId: 'country-us',
          locationId: 'location-chicago',
          postId: '2',
        },
      },
    );

    assert.equal(state.cameraFocusKey, 5);
    assert.equal(state.cameraTargetId, 'country-us');
    assert.equal(state.displayZoomTier, 'world');
    assert.equal(state.isAutoRotateFrozen, false);
  });
});

import {
  clamp,
  MAX_GLOBE_SCALE,
  MIN_GLOBE_SCALE,
  ZOOM_SCALE,
  type ZoomTier,
} from './atlas';

export interface AtlasNavigationState {
  zoomScale: number;
  selectedCountryId: string;
  selectedLocationId: string;
  activePostId: string;
  cameraTargetId: string | null;
  cameraFocusKey: number;
  isAutoRotateFrozen: boolean;
  displayZoomTier: ZoomTier;
}

export interface AtlasNavigationInitialSelection {
  countryId: string;
  locationId: string;
  postId: string;
}

export type AtlasNavigationAction =
  | {
      type: 'sync';
      countryIds: string[];
      locationIds: string[];
      postIds: string[];
      fallback: AtlasNavigationInitialSelection;
    }
  | {
      type: 'set_zoom';
      value: number | ((current: number) => number);
    }
  | { type: 'set_display_tier'; tier: ZoomTier }
  | { type: 'set_rotation_frozen'; frozen: boolean }
  | {
      type: 'select_country';
      countryId: string;
      locationId: string;
      postId: string;
      freezeRotation: boolean;
    }
  | {
      type: 'select_location';
      countryId: string;
      locationId: string;
      postId: string;
      freezeRotation: boolean;
    }
  | {
      type: 'select_post';
      countryId?: string;
      locationId?: string;
      postId: string;
      markerId: string;
      freezeRotation: boolean;
      incrementFocus: boolean;
    }
  | {
      type: 'center_selection';
      countryId?: string;
      locationId?: string;
      postId?: string;
    }
  | {
      type: 'reset';
      selection: AtlasNavigationInitialSelection;
    }
  | {
      type: 'navigate';
      tier: Exclude<ZoomTier, 'place'>;
      targetId: string;
    };

export function createAtlasNavigationState(
  selection: AtlasNavigationInitialSelection,
): AtlasNavigationState {
  return {
    zoomScale: ZOOM_SCALE.world,
    selectedCountryId: selection.countryId,
    selectedLocationId: selection.locationId,
    activePostId: selection.postId,
    cameraTargetId: selection.countryId || null,
    cameraFocusKey: 0,
    isAutoRotateFrozen: false,
    displayZoomTier: 'world',
  };
}

export function atlasNavigationReducer(
  state: AtlasNavigationState,
  action: AtlasNavigationAction,
): AtlasNavigationState {
  switch (action.type) {
    case 'sync':
      return {
        ...state,
        selectedCountryId: action.countryIds.includes(state.selectedCountryId)
          ? state.selectedCountryId
          : action.fallback.countryId,
        selectedLocationId: action.locationIds.includes(
          state.selectedLocationId,
        )
          ? state.selectedLocationId
          : action.fallback.locationId,
        activePostId: action.postIds.includes(state.activePostId)
          ? state.activePostId
          : action.fallback.postId,
        cameraTargetId:
          state.cameraTargetId &&
          action.countryIds.includes(state.cameraTargetId)
            ? state.cameraTargetId
            : action.fallback.countryId || null,
      };

    case 'set_zoom':
      return {
        ...state,
        zoomScale: clamp(
          typeof action.value === 'function'
            ? action.value(state.zoomScale)
            : action.value,
          MIN_GLOBE_SCALE,
          MAX_GLOBE_SCALE,
        ),
      };

    case 'set_display_tier':
      return {
        ...state,
        displayZoomTier: action.tier,
      };

    case 'set_rotation_frozen':
      return {
        ...state,
        isAutoRotateFrozen: action.frozen,
      };

    case 'select_country':
      return {
        ...state,
        selectedCountryId: action.countryId,
        selectedLocationId: action.locationId,
        activePostId: action.postId,
        cameraTargetId: action.countryId,
        cameraFocusKey: state.cameraFocusKey + 1,
        isAutoRotateFrozen: action.freezeRotation,
        displayZoomTier: 'region',
        zoomScale: Math.max(state.zoomScale, ZOOM_SCALE.region),
      };

    case 'select_location':
      return {
        ...state,
        selectedCountryId: action.countryId,
        selectedLocationId: action.locationId,
        activePostId: action.postId,
        cameraTargetId: action.locationId,
        cameraFocusKey: state.cameraFocusKey + 1,
        isAutoRotateFrozen: action.freezeRotation,
        displayZoomTier: 'place',
        zoomScale: Math.max(state.zoomScale, ZOOM_SCALE.place),
      };

    case 'select_post':
      return {
        ...state,
        selectedCountryId: action.countryId ?? state.selectedCountryId,
        selectedLocationId: action.locationId ?? state.selectedLocationId,
        activePostId: action.postId,
        cameraTargetId: action.markerId,
        cameraFocusKey: action.incrementFocus
          ? state.cameraFocusKey + 1
          : state.cameraFocusKey,
        isAutoRotateFrozen: action.freezeRotation,
      };

    case 'center_selection':
      return {
        ...state,
        selectedCountryId: action.countryId ?? state.selectedCountryId,
        selectedLocationId: action.locationId ?? state.selectedLocationId,
        activePostId: action.postId ?? state.activePostId,
      };

    case 'reset':
      return {
        ...createAtlasNavigationState(action.selection),
        cameraFocusKey: state.cameraFocusKey + 1,
      };

    case 'navigate':
      return {
        ...state,
        cameraTargetId: action.targetId,
        cameraFocusKey: state.cameraFocusKey + 1,
        displayZoomTier: action.tier,
        zoomScale: ZOOM_SCALE[action.tier],
        isAutoRotateFrozen: true,
      };
  }
}

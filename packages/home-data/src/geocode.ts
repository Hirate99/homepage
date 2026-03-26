import { getGoogleMapsApiKey } from './env';
import type { LocationDraft } from './types';

interface GoogleAddressComponent {
  long_name?: string;
  short_name?: string;
  types?: string[];
}

interface GoogleGeocodeResult {
  formatted_address?: string;
  address_components?: GoogleAddressComponent[];
  geometry?: {
    location?: {
      lat?: number;
      lng?: number;
    };
  };
}

interface GoogleGeocodeResponse {
  results?: GoogleGeocodeResult[];
  status?: string;
}

interface LegacyPlaceAutocompletePrediction {
  description?: string;
  place_id?: string;
  structured_formatting?: {
    main_text?: string;
    secondary_text?: string;
  };
}

interface LegacyPlaceAutocompleteResponse {
  predictions?: LegacyPlaceAutocompletePrediction[];
  status?: string;
  error_message?: string;
}

interface LegacyPlaceDetailsResult {
  address_components?: GoogleAddressComponent[];
  formatted_address?: string;
  geometry?: {
    location?: {
      lat?: number;
      lng?: number;
    };
  };
  name?: string;
}

interface LegacyPlaceDetailsResponse {
  result?: LegacyPlaceDetailsResult;
  status?: string;
  error_message?: string;
}

export interface PlaceAutocompleteSuggestion {
  placeId: string;
  text: string;
  primaryText: string;
  secondaryText: string;
}

function pickAddressComponent(
  components: GoogleAddressComponent[],
  types: string[],
) {
  const component = components.find((candidate) =>
    candidate.types?.some((type) => types.includes(type)),
  );

  return component?.long_name?.trim() ?? '';
}

function mapGoogleResultToLocationDraft(
  result: GoogleGeocodeResult | undefined,
  source: LocationDraft['source'],
) {
  const components = result?.address_components ?? [];
  const latitude = result?.geometry?.location?.lat;
  const longitude = result?.geometry?.location?.lng;

  return {
    latitude: typeof latitude === 'number' ? latitude : null,
    longitude: typeof longitude === 'number' ? longitude : null,
    locationName:
      pickAddressComponent(components, [
        'locality',
        'postal_town',
        'administrative_area_level_3',
        'administrative_area_level_2',
      ]) || '',
    country: pickAddressComponent(components, ['country']) || '',
    region:
      pickAddressComponent(components, ['administrative_area_level_1']) || '',
    description: '',
    source,
  } satisfies LocationDraft;
}

function mapPlaceDetailsToLocationDraft(
  result: LegacyPlaceDetailsResult | undefined,
): LocationDraft | null {
  const components = result?.address_components ?? [];
  const latitude = result?.geometry?.location?.lat;
  const longitude = result?.geometry?.location?.lng;
  const locationName =
    pickAddressComponent(components, [
      'locality',
      'postal_town',
      'administrative_area_level_3',
      'administrative_area_level_2',
    ]) ||
    result?.name?.trim() ||
    '';
  const country = pickAddressComponent(components, ['country']) || '';
  const region =
    pickAddressComponent(components, ['administrative_area_level_1']) || '';

  const hasAnyValue = [latitude, longitude, locationName, country, region].some(
    (value) => value !== undefined && value !== null && value !== '',
  );

  if (!hasAnyValue) {
    return null;
  }

  return {
    latitude: typeof latitude === 'number' ? latitude : null,
    longitude: typeof longitude === 'number' ? longitude : null,
    locationName,
    country,
    region,
    description: '',
    source: 'manual',
  };
}

export async function reverseGeocodeLocation(
  latitude: number,
  longitude: number,
): Promise<LocationDraft | null> {
  const apiKey = getGoogleMapsApiKey();
  if (!apiKey) {
    return {
      latitude,
      longitude,
      locationName: '',
      country: '',
      region: '',
      description: '',
      source: 'none',
    };
  }

  const query = new URLSearchParams({
    latlng: `${latitude},${longitude}`,
    key: apiKey,
    language: 'en',
  });

  const response = await fetch(
    `https://maps.googleapis.com/maps/api/geocode/json?${query.toString()}`,
    {
      headers: {
        'User-Agent': 'homepage-local-admin/1.0',
      },
    },
  );

  if (!response.ok) {
    throw new Error(
      `Google reverse geocoding failed with status ${response.status}`,
    );
  }

  const payload = (await response.json()) as GoogleGeocodeResponse;
  const result = payload.results?.[0];

  return {
    ...mapGoogleResultToLocationDraft(result, 'exif+google'),
    latitude,
    longitude,
  };
}

export async function geocodeLocationQuery(
  queryText: string,
): Promise<LocationDraft | null> {
  const apiKey = getGoogleMapsApiKey();
  const normalizedQuery = queryText.trim();

  if (!normalizedQuery) {
    throw new Error('Location query is required.');
  }

  if (!apiKey) {
    return null;
  }

  const query = new URLSearchParams({
    address: normalizedQuery,
    key: apiKey,
    language: 'en',
  });

  const response = await fetch(
    `https://maps.googleapis.com/maps/api/geocode/json?${query.toString()}`,
    {
      headers: {
        'User-Agent': 'homepage-local-admin/1.0',
      },
    },
  );

  if (!response.ok) {
    throw new Error(`Google geocoding failed with status ${response.status}`);
  }

  const payload = (await response.json()) as GoogleGeocodeResponse;
  const result = payload.results?.[0];

  if (!result) {
    return null;
  }

  return mapGoogleResultToLocationDraft(result, 'manual');
}

export async function autocompletePlaces(
  queryText: string,
): Promise<PlaceAutocompleteSuggestion[]> {
  const apiKey = getGoogleMapsApiKey();
  const normalizedQuery = queryText.trim();

  if (!normalizedQuery || !apiKey) {
    return [];
  }

  const query = new URLSearchParams({
    input: normalizedQuery,
    key: apiKey,
    language: 'en',
  });

  const response = await fetch(
    `https://maps.googleapis.com/maps/api/place/autocomplete/json?${query.toString()}`,
    {
      headers: {
        'User-Agent': 'homepage-local-admin/1.0',
      },
    },
  );

  const payload = (await response.json()) as LegacyPlaceAutocompleteResponse;

  if (!response.ok) {
    throw new Error(
      payload.error_message ??
        `Google Place autocomplete failed with status ${response.status}`,
    );
  }

  if (
    payload.status &&
    payload.status !== 'OK' &&
    payload.status !== 'ZERO_RESULTS'
  ) {
    throw new Error(
      payload.error_message ??
        `Google Place autocomplete returned ${payload.status}`,
    );
  }

  return (payload.predictions ?? [])
    .map((prediction) => {
      const placeId = prediction.place_id?.trim() ?? '';
      const text = prediction.description?.trim() ?? '';
      const primaryText =
        prediction.structured_formatting?.main_text?.trim() ?? text;
      const secondaryText =
        prediction.structured_formatting?.secondary_text?.trim() ?? '';

      if (!placeId || !text) {
        return null;
      }

      return {
        placeId,
        text,
        primaryText,
        secondaryText,
      } satisfies PlaceAutocompleteSuggestion;
    })
    .filter((suggestion): suggestion is PlaceAutocompleteSuggestion =>
      Boolean(suggestion),
    );
}

export async function resolvePlaceDetails(
  placeId: string,
): Promise<LocationDraft | null> {
  const apiKey = getGoogleMapsApiKey();
  const normalizedPlaceId = placeId.trim();

  if (!normalizedPlaceId) {
    throw new Error('Place ID is required.');
  }

  if (!apiKey) {
    return null;
  }

  const query = new URLSearchParams({
    place_id: normalizedPlaceId,
    language: 'en',
    fields: 'address_component,geometry,name,formatted_address',
    key: apiKey,
  });

  const response = await fetch(
    `https://maps.googleapis.com/maps/api/place/details/json?${query.toString()}`,
    {
      headers: {
        'User-Agent': 'homepage-local-admin/1.0',
      },
    },
  );

  const payload = (await response.json()) as LegacyPlaceDetailsResponse;

  if (!response.ok) {
    throw new Error(
      payload.error_message ??
        `Google Place details failed with status ${response.status}`,
    );
  }

  if (
    payload.status &&
    payload.status !== 'OK' &&
    payload.status !== 'ZERO_RESULTS'
  ) {
    throw new Error(
      payload.error_message ??
        `Google Place details returned ${payload.status}`,
    );
  }

  return mapPlaceDetailsToLocationDraft(payload.result);
}

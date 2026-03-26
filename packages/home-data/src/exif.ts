import * as exifr from 'exifr';

import type { UploadedImageInput } from './types';

export interface GpsCoordinates {
  latitude: number;
  longitude: number;
}

function normalizeCoordinate(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export async function extractGpsFromImage(
  image: UploadedImageInput,
): Promise<GpsCoordinates | null> {
  try {
    const result = await exifr.gps(image.buffer);
    if (!result || typeof result !== 'object') {
      return null;
    }

    const latitude = normalizeCoordinate(
      Reflect.get(result as object, 'latitude') ??
        Reflect.get(result as object, 'lat'),
    );
    const longitude = normalizeCoordinate(
      Reflect.get(result as object, 'longitude') ??
        Reflect.get(result as object, 'lon') ??
        Reflect.get(result as object, 'lng'),
    );

    if (latitude === null || longitude === null) {
      return null;
    }

    return { latitude, longitude };
  } catch {
    return null;
  }
}

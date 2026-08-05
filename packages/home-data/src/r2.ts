import type { HomeDataRuntime } from './runtime';

export async function uploadWebpToR2(
  key: string,
  body: Buffer,
  runtime: HomeDataRuntime,
): Promise<string> {
  await runtime.imageBucket.put(key, body, {
    httpMetadata: {
      contentType: 'image/webp',
      cacheControl: 'public, max-age=31536000, immutable',
    },
  });

  return `${runtime.imagePublicBaseUrl.replace(/\/$/, '')}/${key}`;
}

export async function deleteObjectFromR2(
  key: string,
  runtime: HomeDataRuntime,
) {
  await runtime.imageBucket.delete(key);
}

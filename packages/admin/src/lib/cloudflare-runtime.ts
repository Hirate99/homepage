import { getCloudflareContext } from '@opennextjs/cloudflare';
import type { HomeDataRuntime } from '@homepage/home-data';

type AdminCloudflareEnv = CloudflareEnv & {
  homepage: HomeDataRuntime['database'];
  IMAGES: HomeDataRuntime['imageProcessor'];
  IMAGES_BUCKET: HomeDataRuntime['imageBucket'];
  GOOGLE_MAP_API_KEY: string;
  UPSTASH_REDIS_REST_URL?: string;
  UPSTASH_REDIS_REST_TOKEN?: string;
};

export function getHomeDataRuntime(): HomeDataRuntime {
  const env = getCloudflareContext().env as AdminCloudflareEnv;

  return {
    database: env.homepage,
    imageProcessor: env.IMAGES,
    imageBucket: env.IMAGES_BUCKET,
    imagePublicBaseUrl: 'https://r2.mskyurina.top',
    googleMapsApiKey: env.GOOGLE_MAP_API_KEY,
    redisUrl: env.UPSTASH_REDIS_REST_URL,
    redisToken: env.UPSTASH_REDIS_REST_TOKEN,
  };
}

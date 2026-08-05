import type {
  D1Database,
  ImagesBinding,
  R2Bucket,
} from '@cloudflare/workers-types';

export interface HomeDataRuntime {
  database: D1Database;
  imageProcessor: ImagesBinding;
  imageBucket: R2Bucket;
  imagePublicBaseUrl: string;
  googleMapsApiKey?: string;
  redisUrl?: string;
  redisToken?: string;
}

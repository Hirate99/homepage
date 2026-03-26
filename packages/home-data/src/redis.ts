import { Redis } from '@upstash/redis';

import { getRedisEnv } from './env';

export function redis() {
  const env = getRedisEnv();
  if (!env) {
    return null;
  }

  return new Redis({
    url: env.url,
    token: env.token,
  });
}

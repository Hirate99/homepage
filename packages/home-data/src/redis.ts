import { Redis } from '@upstash/redis';

import type { HomeDataRuntime } from './runtime';

export function redis(runtime: HomeDataRuntime) {
  if (!runtime.redisUrl || !runtime.redisToken) {
    return null;
  }

  return new Redis({
    url: runtime.redisUrl,
    token: runtime.redisToken,
  });
}

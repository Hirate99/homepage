import { PrismaD1 } from '@prisma/adapter-d1';

import { PrismaClient } from './generated/prisma/client';

import type { HomeDataRuntime } from './runtime';

export function prisma(runtime: HomeDataRuntime) {
  const adapter = new PrismaD1(runtime.database);

  return new PrismaClient({ adapter });
}

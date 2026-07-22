import { getCloudflareContext } from '@opennextjs/cloudflare';
import { PrismaClient } from '@prisma/client';
import { PrismaD1 } from '@prisma/adapter-d1';
import { cache } from 'react';

const prisma = cache(() => {
  const adapter = new PrismaD1(getCloudflareContext().env.homepage);
  return new PrismaClient({ adapter });
});

export { prisma };

import { PrismaClient } from '@prisma/client';
import { PrismaD1 } from '@prisma/adapter-d1';

function prisma() {
  const adapter = new PrismaD1({
    CLOUDFLARE_ACCOUNT_ID: process.env.CLOUDFLARE_ACCOUNT_ID!,
    CLOUDFLARE_DATABASE_ID: process.env.CLOUDFLARE_DATABASE_ID!,
    CLOUDFLARE_D1_TOKEN: process.env.CLOUDFLARE_D1_TOKEN!,
  });
  return new PrismaClient({ adapter });
}

export { prisma };

import { PrismaClient } from '@prisma/client';
import { PrismaD1 } from '@prisma/adapter-d1';

import { getDatabaseEnv } from './env';

export function prisma() {
  const env = getDatabaseEnv();
  const adapter = new PrismaD1({
    CLOUDFLARE_ACCOUNT_ID: env.accountId,
    CLOUDFLARE_DATABASE_ID: env.databaseId,
    CLOUDFLARE_D1_TOKEN: env.token,
  });

  return new PrismaClient({ adapter });
}

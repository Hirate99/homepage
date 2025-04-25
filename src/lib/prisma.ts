import { neonConfig } from '@neondatabase/serverless';
import { PrismaNeon } from '@prisma/adapter-neon';
import { PrismaClient } from '@prisma/client';
import ws from 'ws';

if (typeof WebSocket === 'undefined') {
  neonConfig.webSocketConstructor = ws;
}

function prisma() {
  const connectionString = `${process.env.DATABASE_URL}`;

  const adapter = new PrismaNeon({ connectionString });

  return new PrismaClient({ adapter });
}

export { prisma };

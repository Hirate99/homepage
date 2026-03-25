import 'dotenv/config';

import { PrismaClient } from '@prisma/client';
import { PrismaD1 } from '@prisma/adapter-d1';

const PLACE_METADATA = {
  'New York': {
    order: 0,
    locationName: 'New York City',
    country: 'United States',
    region: 'United States',
    latitude: 40.7128,
    longitude: -74.006,
    description: 'Steam, steel, and cold light caught between long avenues.',
  },
  Chicago: {
    order: 1,
    locationName: 'Chicago',
    country: 'United States',
    region: 'United States',
    latitude: 41.8781,
    longitude: -87.6298,
    description:
      'Lake wind, hard shadows, and a downtown that feels cinematic.',
  },
  旭川: {
    order: 2,
    locationName: 'Asahikawa',
    country: 'Japan',
    region: 'Hokkaido, Japan',
    latitude: 43.7706,
    longitude: 142.3648,
    description: 'Quiet winter streets and pale snowlight across Hokkaido.',
  },
  四国: {
    order: 3,
    locationName: 'Shikoku',
    country: 'Japan',
    region: 'Japan',
    latitude: 33.728,
    longitude: 133.5311,
    description:
      'Shrines, coastlines, and train windows moving across the island.',
  },
};

function parseArgs(argv) {
  const options = {
    dryRun: false,
    force: false,
    remote: false,
  };

  for (const arg of argv) {
    if (arg === '--dry-run') {
      options.dryRun = true;
      continue;
    }

    if (arg === '--force') {
      options.force = true;
      continue;
    }

    if (arg === '--remote') {
      options.remote = true;
    }
  }

  return options;
}

function createPrismaClient(options) {
  if (
    options.remote &&
    process.env.CLOUDFLARE_ACCOUNT_ID &&
    process.env.CLOUDFLARE_DATABASE_ID &&
    process.env.CLOUDFLARE_D1_TOKEN
  ) {
    const adapter = new PrismaD1({
      CLOUDFLARE_ACCOUNT_ID: process.env.CLOUDFLARE_ACCOUNT_ID,
      CLOUDFLARE_DATABASE_ID: process.env.CLOUDFLARE_DATABASE_ID,
      CLOUDFLARE_D1_TOKEN: process.env.CLOUDFLARE_D1_TOKEN,
    });

    return new PrismaClient({ adapter });
  }

  return new PrismaClient();
}

function isAlreadyBackfilled(collection, metadata) {
  return (
    collection.sortOrder === metadata.order &&
    collection.locationName === metadata.locationName &&
    collection.country === metadata.country &&
    collection.region === metadata.region &&
    collection.latitude === metadata.latitude &&
    collection.longitude === metadata.longitude &&
    collection.description === metadata.description
  );
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const prisma = createPrismaClient(options);

  console.log(
    `[backfill-collection-locations] start dryRun=${options.dryRun} force=${options.force} remote=${options.remote}`,
  );

  try {
    const collections = await prisma.collection.findMany({
      where: {
        title: {
          in: Object.keys(PLACE_METADATA),
        },
      },
      select: {
        id: true,
        title: true,
        sortOrder: true,
        locationName: true,
        country: true,
        region: true,
        latitude: true,
        longitude: true,
        description: true,
      },
      orderBy: {
        id: 'asc',
      },
    });

    if (!collections.length) {
      console.log(
        '[backfill-collection-locations] no matching collections found',
      );
      return;
    }

    let updated = 0;
    let skipped = 0;

    for (const collection of collections) {
      if (!collection.title) {
        skipped += 1;
        continue;
      }

      const metadata = PLACE_METADATA[collection.title];
      if (!metadata) {
        skipped += 1;
        continue;
      }

      if (!options.force && isAlreadyBackfilled(collection, metadata)) {
        skipped += 1;
        continue;
      }

      const data = {
        sortOrder: metadata.order,
        locationName: metadata.locationName,
        country: metadata.country,
        region: metadata.region,
        latitude: metadata.latitude,
        longitude: metadata.longitude,
        description: metadata.description,
      };

      if (!options.dryRun) {
        await prisma.collection.update({
          where: { id: collection.id },
          data,
        });
      }

      updated += 1;
      console.log(
        `[backfill-collection-locations] ${options.dryRun ? 'would update' : 'updated'} collection=${collection.id} title=${collection.title}`,
      );
    }

    console.log('[backfill-collection-locations] done');
    console.log(`updated: ${updated}`);
    console.log(`skipped: ${skipped}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error('[backfill-collection-locations] fatal:', error);
  process.exit(1);
});

import 'dotenv/config';

import { PrismaClient } from '@prisma/client';
import { PrismaD1 } from '@prisma/adapter-d1';
import sharp from 'sharp';

function parseArgs(argv) {
  const options = {
    force: false,
    dryRun: false,
    limit: 0,
    concurrency: 4,
    timeoutMs: 15000,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--force') {
      options.force = true;
      continue;
    }
    if (arg === '--dry-run') {
      options.dryRun = true;
      continue;
    }
    if (arg === '--limit' && argv[i + 1]) {
      options.limit = Number(argv[++i]) || 0;
      continue;
    }
    if (arg === '--concurrency' && argv[i + 1]) {
      options.concurrency = Math.max(1, Number(argv[++i]) || 1);
      continue;
    }
    if (arg === '--timeout' && argv[i + 1]) {
      options.timeoutMs = Math.max(1000, Number(argv[++i]) || 15000);
    }
  }

  return options;
}

function createPrismaClient() {
  if (
    !process.env.CLOUDFLARE_ACCOUNT_ID ||
    !process.env.CLOUDFLARE_DATABASE_ID ||
    !process.env.CLOUDFLARE_D1_TOKEN
  ) {
    throw new Error(
      'Missing D1 credentials. Set CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_DATABASE_ID and CLOUDFLARE_D1_TOKEN.',
    );
  }

  const adapter = new PrismaD1({
    CLOUDFLARE_ACCOUNT_ID: process.env.CLOUDFLARE_ACCOUNT_ID,
    CLOUDFLARE_DATABASE_ID: process.env.CLOUDFLARE_DATABASE_ID,
    CLOUDFLARE_D1_TOKEN: process.env.CLOUDFLARE_D1_TOKEN,
  });

  return new PrismaClient({ adapter });
}

async function detectImageDimensions(buffer) {
  const metadata = await sharp(buffer, { failOn: 'none' }).metadata();
  if (!metadata.width || !metadata.height) {
    return null;
  }
  return {
    width: metadata.width,
    height: metadata.height,
  };
}

async function fetchImageBuffer(url, timeoutMs) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } finally {
    clearTimeout(timeoutId);
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const prisma = createPrismaClient();
  const sizeCacheBySrc = new Map();

  console.log(
    `[backfill-image-dimensions] start force=${options.force} dryRun=${options.dryRun} limit=${options.limit || 'all'} concurrency=${options.concurrency}`,
  );

  try {
    const images = await prisma.image.findMany({
      where: options.force
        ? undefined
        : {
            OR: [{ width: null }, { height: null }],
          },
      select: {
        id: true,
        src: true,
        width: true,
        height: true,
      },
      orderBy: { id: 'asc' },
      ...(options.limit > 0 ? { take: options.limit } : {}),
    });

    if (!images.length) {
      console.log('[backfill-image-dimensions] nothing to update');
      return;
    }

    const stats = {
      processed: 0,
      updated: 0,
      unsupported: 0,
      failed: 0,
      skipped: 0,
    };

    let cursor = 0;

    const worker = async () => {
      while (true) {
        const currentIndex = cursor++;
        if (currentIndex >= images.length) {
          return;
        }

        const image = images[currentIndex];
        stats.processed += 1;

        try {
          let dimensions = sizeCacheBySrc.get(image.src);
          if (dimensions === undefined) {
            const buffer = await fetchImageBuffer(image.src, options.timeoutMs);
            dimensions = await detectImageDimensions(buffer);
            sizeCacheBySrc.set(image.src, dimensions ?? null);
          }

          if (!dimensions) {
            stats.unsupported += 1;
            console.warn(
              `[${stats.processed}/${images.length}] unsupported format: id=${image.id}`,
            );
            continue;
          }

          if (
            !options.force &&
            image.width === dimensions.width &&
            image.height === dimensions.height
          ) {
            stats.skipped += 1;
            continue;
          }

          if (!options.dryRun) {
            await prisma.image.update({
              where: { id: image.id },
              data: {
                width: dimensions.width,
                height: dimensions.height,
              },
            });
          }

          stats.updated += 1;
          console.log(
            `[${stats.processed}/${images.length}] ${options.dryRun ? 'would update' : 'updated'} id=${image.id} ${dimensions.width}x${dimensions.height}`,
          );
        } catch (error) {
          stats.failed += 1;
          console.error(
            `[${stats.processed}/${images.length}] failed id=${image.id}:`,
            error instanceof Error ? error.message : error,
          );
        }
      }
    };

    await Promise.all(
      Array.from({ length: options.concurrency }, () => worker()),
    );

    console.log('\n[backfill-image-dimensions] done');
    console.log(`processed: ${stats.processed}`);
    console.log(`updated: ${stats.updated}`);
    console.log(`skipped: ${stats.skipped}`);
    console.log(`unsupported: ${stats.unsupported}`);
    console.log(`failed: ${stats.failed}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error('[backfill-image-dimensions] fatal:', error);
  process.exit(1);
});

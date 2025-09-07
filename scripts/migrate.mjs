import { PrismaClient } from '@prisma/client';
import { PrismaD1 } from '@prisma/adapter-d1';
import { Client } from 'pg';

async function main() {
  console.log('Starting migration from Neon (PostgreSQL) to Cloudflare D1...');

  // 1. Setup destination client (D1)
  console.log('Connecting to destination Cloudflare D1 database...');
  if (
    !process.env.CLOUDFLARE_ACCOUNT_ID ||
    !process.env.CLOUDFLARE_DATABASE_ID ||
    !process.env.CLOUDFLARE_D1_TOKEN
  ) {
    console.error(
      'Error: Cloudflare D1 environment variables are not set. Please check your .env file.',
    );
    process.exit(1);
  }
  const d1Adapter = new PrismaD1({
    CLOUDFLARE_ACCOUNT_ID: process.env.CLOUDFLARE_ACCOUNT_ID,
    CLOUDFLARE_DATABASE_ID: process.env.CLOUDFLARE_DATABASE_ID,
    CLOUDFLARE_D1_TOKEN: process.env.CLOUDFLARE_D1_TOKEN,
  });
  const d1Client = new PrismaClient({ adapter: d1Adapter });

  // 2. Setup source client (Neon)
  console.log('Connecting to source Neon database...');
  const neonClient = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await neonClient.connect();

    // 3. Fetch data from source
    console.log('Fetching data from Neon...');
    const collectionsResult = await neonClient.query(
      'SELECT * FROM "Collection"',
    );
    const imagesResult = await neonClient.query('SELECT * FROM "Image"');
    const collections = collectionsResult.rows;
    const images = imagesResult.rows;
    console.log(
      `Found ${collections.length} collections and ${images.length} images to migrate.`,
    );

    // Group images by collectionId for efficient lookup
    const imagesByCollectionId = images.reduce((acc, image) => {
      if (image.collectionId) {
        if (!acc[image.collectionId]) {
          acc[image.collectionId] = [];
        }
        acc[image.collectionId].push(image);
      }
      return acc;
    }, {});

    // 4. Write data to destination
    console.log('Migrating data to D1...');
    let migratedCount = 0;
    for (const collection of collections) {
      const newCollection = await d1Client.collection.create({
        data: {
          title: collection.title,
          content: collection.content,
          cover: collection.cover,
          createdAt: collection.createdAt,
          updatedAt: collection.updatedAt,
        },
      });

      const relatedImages = imagesByCollectionId[collection.id] || [];
      if (relatedImages.length > 0) {
        for (const image of relatedImages) {
          await d1Client.image.create({
            data: {
              src: image.src,
              createdAt: image.createdAt,
              updatedAt: image.updatedAt,
              collectionId: newCollection.id, // Link to the new collection ID
            },
          });
        }
      }
      migratedCount++;
      console.log(
        `Migrated collection ${migratedCount}/${collections.length}: ${collection.title}`,
      );
    }

    console.log('\nMigration completed successfully! ✅');
    console.log(
      `${migratedCount} collections and their associated images have been migrated to Cloudflare D1.`,
    );
  } catch (error) {
    console.error('\nMigration failed:');
    console.error(error);
    process.exit(1);
  } finally {
    // 5. Disconnect clients
    await neonClient.end();
    await d1Client.$disconnect();
  }
}

main();

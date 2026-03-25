-- Add location metadata columns to collections so the globe atlas can read
-- production data directly from D1 instead of relying on local fallbacks.
ALTER TABLE "Collection" ADD COLUMN "sortOrder" INTEGER;
ALTER TABLE "Collection" ADD COLUMN "locationName" TEXT;
ALTER TABLE "Collection" ADD COLUMN "country" TEXT;
ALTER TABLE "Collection" ADD COLUMN "region" TEXT;
ALTER TABLE "Collection" ADD COLUMN "latitude" REAL;
ALTER TABLE "Collection" ADD COLUMN "longitude" REAL;
ALTER TABLE "Collection" ADD COLUMN "description" TEXT;

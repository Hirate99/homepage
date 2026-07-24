ALTER TABLE "Image" ADD COLUMN "sortOrder" INTEGER;

UPDATE "Image"
SET "sortOrder" = "id"
WHERE "sortOrder" IS NULL;

CREATE INDEX "Image_collectionId_sortOrder_idx"
ON "Image"("collectionId", "sortOrder");

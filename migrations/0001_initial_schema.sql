-- CreateTable
CREATE TABLE "Collection" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT,
    "content" TEXT,
    "cover" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Image" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "src" TEXT NOT NULL,
    "collectionId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Image_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "Collection" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

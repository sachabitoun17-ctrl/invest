-- CreateTable
CREATE TABLE "Property" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "postalCode" TEXT,
    "lat" REAL,
    "lng" REAL,
    "surface" REAL NOT NULL,
    "rooms" INTEGER,
    "floor" INTEGER,
    "type" TEXT,
    "price" REAL NOT NULL,
    "notaryFees" REAL,
    "renovMin" REAL,
    "renovMax" REAL,
    "rentMin" REAL,
    "rentMax" REAL,
    "description" TEXT,
    "pdfName" TEXT,
    "sourceText" TEXT
);

-- CreateTable
CREATE TABLE "Vote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "comment" TEXT,
    "propertyId" TEXT NOT NULL,
    CONSTRAINT "Vote_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Vote_user_propertyId_key" ON "Vote"("user", "propertyId");

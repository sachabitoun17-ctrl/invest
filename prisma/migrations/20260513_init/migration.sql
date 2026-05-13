CREATE TABLE "Property" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "postalCode" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "surface" DOUBLE PRECISION NOT NULL,
    "rooms" INTEGER,
    "floor" INTEGER,
    "type" TEXT,
    "price" DOUBLE PRECISION NOT NULL,
    "notaryFees" DOUBLE PRECISION,
    "renovMin" DOUBLE PRECISION,
    "renovMax" DOUBLE PRECISION,
    "rentMin" DOUBLE PRECISION,
    "rentMax" DOUBLE PRECISION,
    "strategy" TEXT,
    "marketPriceM2" DOUBLE PRECISION,
    "dpe" TEXT,
    "transport" TEXT,
    "description" TEXT,
    "pdfName" TEXT,
    "sourceText" TEXT,
    CONSTRAINT "Property_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Vote" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "comment" TEXT,
    "propertyId" TEXT NOT NULL,
    CONSTRAINT "Vote_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Vote" ADD CONSTRAINT "Vote_propertyId_fkey"
    FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX "Vote_user_propertyId_key" ON "Vote"("user", "propertyId");

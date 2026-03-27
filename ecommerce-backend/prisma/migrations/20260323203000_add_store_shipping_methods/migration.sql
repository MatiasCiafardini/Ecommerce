CREATE TABLE "StoreShippingMethod" (
  "id" TEXT NOT NULL,
  "storeId" INTEGER NOT NULL,
  "name" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "price" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "description" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "displayOrder" INTEGER NOT NULL DEFAULT 0,
  "deletedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "StoreShippingMethod_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "StoreShippingMethod_storeId_active_displayOrder_idx"
ON "StoreShippingMethod"("storeId", "active", "displayOrder");

CREATE INDEX "StoreShippingMethod_storeId_deletedAt_idx"
ON "StoreShippingMethod"("storeId", "deletedAt");

ALTER TABLE "StoreShippingMethod"
ADD CONSTRAINT "StoreShippingMethod_storeId_fkey"
FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

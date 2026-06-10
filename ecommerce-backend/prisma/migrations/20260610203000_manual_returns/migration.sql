CREATE TABLE "ManualReturn" (
  "id" SERIAL NOT NULL,
  "storeId" INTEGER NOT NULL,
  "customerName" TEXT,
  "notes" TEXT,
  "totalReturned" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "totalExchange" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "differenceAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ManualReturn_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ManualReturnItem" (
  "id" SERIAL NOT NULL,
  "manualReturnId" INTEGER NOT NULL,
  "storeId" INTEGER NOT NULL,
  "variantId" INTEGER NOT NULL,
  "kind" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL,
  "price" DECIMAL(10,2) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ManualReturnItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ManualReturn_storeId_createdAt_idx" ON "ManualReturn"("storeId", "createdAt");
CREATE INDEX "ManualReturnItem_manualReturnId_idx" ON "ManualReturnItem"("manualReturnId");
CREATE INDEX "ManualReturnItem_storeId_kind_idx" ON "ManualReturnItem"("storeId", "kind");
CREATE INDEX "ManualReturnItem_variantId_idx" ON "ManualReturnItem"("variantId");

ALTER TABLE "ManualReturn"
  ADD CONSTRAINT "ManualReturn_storeId_fkey"
  FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ManualReturnItem"
  ADD CONSTRAINT "ManualReturnItem_manualReturnId_fkey"
  FOREIGN KEY ("manualReturnId") REFERENCES "ManualReturn"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ManualReturnItem"
  ADD CONSTRAINT "ManualReturnItem_variantId_fkey"
  FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

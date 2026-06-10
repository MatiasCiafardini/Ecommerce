ALTER TABLE "Customer"
ADD COLUMN "source" TEXT NOT NULL DEFAULT 'storefront';

UPDATE "Customer" c
SET "source" = 'current_account'
WHERE EXISTS (
  SELECT 1
  FROM "CurrentAccount" ca
  WHERE ca."customerId" = c."id"
);

CREATE INDEX "Customer_storeId_source_idx" ON "Customer"("storeId", "source");

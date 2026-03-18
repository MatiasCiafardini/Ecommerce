ALTER TABLE "CustomerAddress"
ADD COLUMN IF NOT EXISTS "storeId" INTEGER;

UPDATE "CustomerAddress" ca
SET "storeId" = c."storeId"
FROM "Customer" c
WHERE ca."customerId" = c."id"
  AND ca."storeId" IS NULL;

ALTER TABLE "CustomerAddress"
ALTER COLUMN "storeId" SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'CustomerAddress_storeId_fkey'
  ) THEN
    ALTER TABLE "CustomerAddress"
    ADD CONSTRAINT "CustomerAddress_storeId_fkey"
    FOREIGN KEY ("storeId") REFERENCES "Store"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "CustomerAddress_storeId_idx"
ON "CustomerAddress"("storeId");

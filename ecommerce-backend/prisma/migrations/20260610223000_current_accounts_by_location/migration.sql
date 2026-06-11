ALTER TABLE "CurrentAccount"
ADD COLUMN IF NOT EXISTS "storeLocationId" INTEGER;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'CurrentAccount_storeLocationId_fkey'
  ) THEN
    ALTER TABLE "CurrentAccount"
    ADD CONSTRAINT "CurrentAccount_storeLocationId_fkey"
    FOREIGN KEY ("storeLocationId") REFERENCES "StoreLocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "CurrentAccount_storeId_storeLocationId_idx"
ON "CurrentAccount"("storeId", "storeLocationId");

UPDATE "CurrentAccount" account
SET "storeLocationId" = movement."storeLocationId"
FROM (
  SELECT DISTINCT ON ("accountId") "accountId", "storeLocationId"
  FROM "CurrentAccountMovement"
  WHERE "storeLocationId" IS NOT NULL
  ORDER BY "accountId", "createdAt" ASC
) movement
WHERE account."id" = movement."accountId"
  AND account."storeLocationId" IS NULL;

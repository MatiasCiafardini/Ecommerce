ALTER TABLE "ProductOption"
ADD COLUMN IF NOT EXISTS "attributeType" TEXT NOT NULL DEFAULT 'text',
ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "ProductOption"
SET "attributeType" = CASE
  WHEN LOWER("name") = 'color' THEN 'color'
  ELSE 'text'
END
WHERE "attributeType" IS NULL OR "attributeType" = 'text';

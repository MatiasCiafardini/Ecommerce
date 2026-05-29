CREATE TABLE IF NOT EXISTS "ProductOptionReusableValue" (
  "id" SERIAL NOT NULL,
  "productOptionId" INTEGER NOT NULL,
  "value" TEXT NOT NULL,
  "position" INTEGER NOT NULL DEFAULT 0,
  "visualColor" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProductOptionReusableValue_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ProductOptionReusableValue_productOptionId_value_key"
ON "ProductOptionReusableValue"("productOptionId", "value");

CREATE INDEX IF NOT EXISTS "ProductOptionReusableValue_productOptionId_position_idx"
ON "ProductOptionReusableValue"("productOptionId", "position");

ALTER TABLE "ProductOptionReusableValue"
ADD CONSTRAINT "ProductOptionReusableValue_productOptionId_fkey"
FOREIGN KEY ("productOptionId") REFERENCES "ProductOption"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "ProductOptionReusableValue" ("productOptionId", "value", "position")
SELECT
  pov."productOptionId",
  pov."value",
  ROW_NUMBER() OVER (
    PARTITION BY pov."productOptionId"
    ORDER BY LOWER(pov."value"), pov."value"
  ) - 1 AS "position"
FROM (
  SELECT DISTINCT "productOptionId", "value"
  FROM "ProductOptionValue"
) pov
ON CONFLICT ("productOptionId", "value") DO NOTHING;

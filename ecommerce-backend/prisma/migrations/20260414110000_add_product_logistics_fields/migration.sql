ALTER TABLE "Product"
ADD COLUMN "weightGrams" DOUBLE PRECISION,
ADD COLUMN "packageHeightCm" DOUBLE PRECISION,
ADD COLUMN "packageWidthCm" DOUBLE PRECISION,
ADD COLUMN "packageLengthCm" DOUBLE PRECISION;

ALTER TABLE "ProductVariant"
ADD COLUMN "weightGrams" DOUBLE PRECISION,
ADD COLUMN "packageHeightCm" DOUBLE PRECISION,
ADD COLUMN "packageWidthCm" DOUBLE PRECISION,
ADD COLUMN "packageLengthCm" DOUBLE PRECISION;

UPDATE "ProductVariant"
SET
  "weightGrams" = CASE
    WHEN "weightGrams" IS NULL AND "weight" IS NOT NULL AND "weight" > 0
      THEN ROUND("weight" * 1000.0)
    ELSE "weightGrams"
  END,
  "packageHeightCm" = CASE
    WHEN "packageHeightCm" IS NULL AND "height" IS NOT NULL AND "height" > 0
      THEN "height"
    ELSE "packageHeightCm"
  END,
  "packageWidthCm" = CASE
    WHEN "packageWidthCm" IS NULL AND "width" IS NOT NULL AND "width" > 0
      THEN "width"
    ELSE "packageWidthCm"
  END,
  "packageLengthCm" = CASE
    WHEN "packageLengthCm" IS NULL AND "length" IS NOT NULL AND "length" > 0
      THEN "length"
    ELSE "packageLengthCm"
  END;

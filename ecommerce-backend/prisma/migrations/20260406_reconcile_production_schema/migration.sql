DO $$
BEGIN
  CREATE TYPE "DiscountScope" AS ENUM (
    'order',
    'product',
    'category',
    'variant',
    'option_value',
    'option'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
  CREATE TYPE "CancellationRequestStatus" AS ENUM (
    'requested',
    'approved',
    'rejected',
    'refunded'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

ALTER TABLE "Discount"
ADD COLUMN IF NOT EXISTS "scope" "DiscountScope" NOT NULL DEFAULT 'order';

ALTER TABLE "Coupon"
ADD COLUMN IF NOT EXISTS "storeId" INTEGER;

UPDATE "Coupon" c
SET "storeId" = d."storeId"
FROM "Discount" d
WHERE c."discountId" = d."id"
  AND c."storeId" IS NULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "Coupon" WHERE "storeId" IS NULL) THEN
    RAISE EXCEPTION 'Cannot set Coupon.storeId to NOT NULL because there are rows without a matching Discount.storeId';
  END IF;
END
$$;

ALTER TABLE "Coupon"
ALTER COLUMN "storeId" SET NOT NULL;

CREATE TABLE IF NOT EXISTS "ProductOption" (
  "id" SERIAL NOT NULL,
  "name" TEXT NOT NULL,
  "storeId" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProductOption_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ProductOptionValue" (
  "id" SERIAL NOT NULL,
  "productOptionId" INTEGER NOT NULL,
  "productId" INTEGER NOT NULL,
  "value" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProductOptionValue_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "CancellationRequest" (
  "id" SERIAL NOT NULL,
  "storeId" INTEGER NOT NULL,
  "orderId" INTEGER NOT NULL,
  "customerId" INTEGER NOT NULL,
  "reason" TEXT,
  "status" "CancellationRequestStatus" NOT NULL DEFAULT 'requested',
  "refundAmount" DECIMAL(10,2),
  "adminNotes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "reviewedAt" TIMESTAMP(3),
  CONSTRAINT "CancellationRequest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "DiscountCategory" (
  "discountId" INTEGER NOT NULL,
  "categoryId" INTEGER NOT NULL,
  CONSTRAINT "DiscountCategory_pkey" PRIMARY KEY ("discountId","categoryId")
);

CREATE TABLE IF NOT EXISTS "DiscountOption" (
  "discountId" INTEGER NOT NULL,
  "productOptionId" INTEGER NOT NULL,
  CONSTRAINT "DiscountOption_pkey" PRIMARY KEY ("discountId","productOptionId")
);

CREATE TABLE IF NOT EXISTS "DiscountOptionValue" (
  "discountId" INTEGER NOT NULL,
  "productOptionId" INTEGER NOT NULL,
  "value" TEXT NOT NULL,
  CONSTRAINT "DiscountOptionValue_pkey" PRIMARY KEY ("discountId","productOptionId","value")
);

CREATE TABLE IF NOT EXISTS "DiscountProduct" (
  "discountId" INTEGER NOT NULL,
  "productId" INTEGER NOT NULL,
  CONSTRAINT "DiscountProduct_pkey" PRIMARY KEY ("discountId","productId")
);

CREATE TABLE IF NOT EXISTS "DiscountVariant" (
  "discountId" INTEGER NOT NULL,
  "variantId" INTEGER NOT NULL,
  CONSTRAINT "DiscountVariant_pkey" PRIMARY KEY ("discountId","variantId")
);

ALTER TABLE "Refund"
ALTER COLUMN "returnId" DROP NOT NULL;

ALTER TABLE "Payment"
ALTER COLUMN "updatedAt" DROP DEFAULT;

DROP INDEX IF EXISTS "Coupon_code_key";
DROP INDEX IF EXISTS "User_email_key";
DROP INDEX IF EXISTS "ProductVariant_sku_key";

CREATE INDEX IF NOT EXISTS "ProductOption_storeId_idx"
ON "ProductOption"("storeId");

CREATE UNIQUE INDEX IF NOT EXISTS "ProductOption_storeId_name_key"
ON "ProductOption"("storeId", "name");

CREATE INDEX IF NOT EXISTS "ProductOptionValue_productOptionId_idx"
ON "ProductOptionValue"("productOptionId");

CREATE INDEX IF NOT EXISTS "ProductOptionValue_productId_idx"
ON "ProductOptionValue"("productId");

CREATE UNIQUE INDEX IF NOT EXISTS "ProductOptionValue_productOptionId_productId_value_key"
ON "ProductOptionValue"("productOptionId", "productId", "value");

CREATE UNIQUE INDEX IF NOT EXISTS "CancellationRequest_orderId_key"
ON "CancellationRequest"("orderId");

CREATE INDEX IF NOT EXISTS "CancellationRequest_customerId_idx"
ON "CancellationRequest"("customerId");

CREATE INDEX IF NOT EXISTS "CancellationRequest_storeId_status_idx"
ON "CancellationRequest"("storeId", "status");

CREATE INDEX IF NOT EXISTS "DiscountCategory_categoryId_idx"
ON "DiscountCategory"("categoryId");

CREATE INDEX IF NOT EXISTS "DiscountOption_productOptionId_idx"
ON "DiscountOption"("productOptionId");

CREATE INDEX IF NOT EXISTS "DiscountOptionValue_productOptionId_value_idx"
ON "DiscountOptionValue"("productOptionId", "value");

CREATE INDEX IF NOT EXISTS "DiscountProduct_productId_idx"
ON "DiscountProduct"("productId");

CREATE INDEX IF NOT EXISTS "DiscountVariant_variantId_idx"
ON "DiscountVariant"("variantId");

CREATE UNIQUE INDEX IF NOT EXISTS "Coupon_storeId_code_key"
ON "Coupon"("storeId", "code");

CREATE UNIQUE INDEX IF NOT EXISTS "User_storeId_email_key"
ON "User"("storeId", "email");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ProductOption_storeId_fkey'
  ) THEN
    ALTER TABLE "ProductOption"
    ADD CONSTRAINT "ProductOption_storeId_fkey"
    FOREIGN KEY ("storeId") REFERENCES "Store"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ProductOptionValue_productId_fkey'
  ) THEN
    ALTER TABLE "ProductOptionValue"
    ADD CONSTRAINT "ProductOptionValue_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "Product"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ProductOptionValue_productOptionId_fkey'
  ) THEN
    ALTER TABLE "ProductOptionValue"
    ADD CONSTRAINT "ProductOptionValue_productOptionId_fkey"
    FOREIGN KEY ("productOptionId") REFERENCES "ProductOption"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'Coupon_storeId_fkey'
  ) THEN
    ALTER TABLE "Coupon"
    ADD CONSTRAINT "Coupon_storeId_fkey"
    FOREIGN KEY ("storeId") REFERENCES "Store"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'Refund_returnId_fkey'
  ) THEN
    ALTER TABLE "Refund"
    ADD CONSTRAINT "Refund_returnId_fkey"
    FOREIGN KEY ("returnId") REFERENCES "Return"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'CancellationRequest_customerId_fkey'
  ) THEN
    ALTER TABLE "CancellationRequest"
    ADD CONSTRAINT "CancellationRequest_customerId_fkey"
    FOREIGN KEY ("customerId") REFERENCES "Customer"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'CancellationRequest_orderId_fkey'
  ) THEN
    ALTER TABLE "CancellationRequest"
    ADD CONSTRAINT "CancellationRequest_orderId_fkey"
    FOREIGN KEY ("orderId") REFERENCES "Order"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'CancellationRequest_storeId_fkey'
  ) THEN
    ALTER TABLE "CancellationRequest"
    ADD CONSTRAINT "CancellationRequest_storeId_fkey"
    FOREIGN KEY ("storeId") REFERENCES "Store"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'DiscountCategory_categoryId_fkey'
  ) THEN
    ALTER TABLE "DiscountCategory"
    ADD CONSTRAINT "DiscountCategory_categoryId_fkey"
    FOREIGN KEY ("categoryId") REFERENCES "Category"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'DiscountCategory_discountId_fkey'
  ) THEN
    ALTER TABLE "DiscountCategory"
    ADD CONSTRAINT "DiscountCategory_discountId_fkey"
    FOREIGN KEY ("discountId") REFERENCES "Discount"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'DiscountOption_discountId_fkey'
  ) THEN
    ALTER TABLE "DiscountOption"
    ADD CONSTRAINT "DiscountOption_discountId_fkey"
    FOREIGN KEY ("discountId") REFERENCES "Discount"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'DiscountOption_productOptionId_fkey'
  ) THEN
    ALTER TABLE "DiscountOption"
    ADD CONSTRAINT "DiscountOption_productOptionId_fkey"
    FOREIGN KEY ("productOptionId") REFERENCES "ProductOption"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'DiscountOptionValue_discountId_fkey'
  ) THEN
    ALTER TABLE "DiscountOptionValue"
    ADD CONSTRAINT "DiscountOptionValue_discountId_fkey"
    FOREIGN KEY ("discountId") REFERENCES "Discount"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'DiscountOptionValue_productOptionId_fkey'
  ) THEN
    ALTER TABLE "DiscountOptionValue"
    ADD CONSTRAINT "DiscountOptionValue_productOptionId_fkey"
    FOREIGN KEY ("productOptionId") REFERENCES "ProductOption"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'DiscountProduct_discountId_fkey'
  ) THEN
    ALTER TABLE "DiscountProduct"
    ADD CONSTRAINT "DiscountProduct_discountId_fkey"
    FOREIGN KEY ("discountId") REFERENCES "Discount"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'DiscountProduct_productId_fkey'
  ) THEN
    ALTER TABLE "DiscountProduct"
    ADD CONSTRAINT "DiscountProduct_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "Product"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'DiscountVariant_discountId_fkey'
  ) THEN
    ALTER TABLE "DiscountVariant"
    ADD CONSTRAINT "DiscountVariant_discountId_fkey"
    FOREIGN KEY ("discountId") REFERENCES "Discount"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'DiscountVariant_variantId_fkey'
  ) THEN
    ALTER TABLE "DiscountVariant"
    ADD CONSTRAINT "DiscountVariant_variantId_fkey"
    FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;

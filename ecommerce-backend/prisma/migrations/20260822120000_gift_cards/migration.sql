CREATE TYPE "ProductType" AS ENUM ('STANDARD', 'GIFT_CARD');
CREATE TYPE "GiftCardStatus" AS ENUM ('ACTIVE', 'REDEEMED', 'CANCELLED');
CREATE TYPE "GiftCardMovementType" AS ENUM ('ISSUE', 'REDEEM', 'REFUND', 'CANCEL', 'ADJUSTMENT');

ALTER TABLE "Product"
ADD COLUMN "type" "ProductType" NOT NULL DEFAULT 'STANDARD',
ADD COLUMN "trackInventory" BOOLEAN NOT NULL DEFAULT true;

UPDATE "Product"
SET "type" = 'GIFT_CARD', "trackInventory" = false, "inventoryPolicy" = 'UNTRACKED'
WHERE "inventoryPolicy" = 'UNTRACKED'
  AND title ~* '(^|[[:space:]_-])gift[[:space:]_-]*card([[:space:]_-]|$)';

CREATE TABLE "GiftCard" (
  "id" SERIAL NOT NULL,
  "storeId" INTEGER NOT NULL,
  "orderItemId" INTEGER NOT NULL,
  "issuedAtLocationId" INTEGER,
  "issuedByUserId" INTEGER,
  "code" TEXT NOT NULL,
  "codeLastFour" TEXT NOT NULL,
  "initialAmount" DECIMAL(10,2) NOT NULL,
  "balance" DECIMAL(10,2) NOT NULL,
  "status" "GiftCardStatus" NOT NULL DEFAULT 'ACTIVE',
  "purchaserName" TEXT,
  "purchaserEmail" TEXT,
  "purchaserPhone" TEXT,
  "recipientName" TEXT NOT NULL,
  "recipientEmail" TEXT,
  "recipientPhone" TEXT,
  "message" TEXT,
  "expiresAt" TIMESTAMP(3),
  "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "GiftCard_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "GiftCardMovement" (
  "id" SERIAL NOT NULL,
  "storeId" INTEGER NOT NULL,
  "giftCardId" INTEGER NOT NULL,
  "orderId" INTEGER,
  "storeLocationId" INTEGER,
  "actorUserId" INTEGER,
  "type" "GiftCardMovementType" NOT NULL,
  "amount" DECIMAL(10,2) NOT NULL,
  "balanceBefore" DECIMAL(10,2) NOT NULL,
  "balanceAfter" DECIMAL(10,2) NOT NULL,
  "reason" TEXT,
  "idempotencyKey" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GiftCardMovement_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GiftCard_orderItemId_key" ON "GiftCard"("orderItemId");
CREATE UNIQUE INDEX "GiftCard_storeId_code_key" ON "GiftCard"("storeId", "code");
CREATE INDEX "GiftCard_storeId_status_createdAt_idx" ON "GiftCard"("storeId", "status", "createdAt");
CREATE INDEX "GiftCard_storeId_codeLastFour_idx" ON "GiftCard"("storeId", "codeLastFour");
CREATE INDEX "GiftCard_issuedAtLocationId_idx" ON "GiftCard"("issuedAtLocationId");
CREATE UNIQUE INDEX "GiftCardMovement_storeId_idempotencyKey_key" ON "GiftCardMovement"("storeId", "idempotencyKey");
CREATE INDEX "GiftCardMovement_giftCardId_createdAt_idx" ON "GiftCardMovement"("giftCardId", "createdAt");
CREATE INDEX "GiftCardMovement_storeId_type_createdAt_idx" ON "GiftCardMovement"("storeId", "type", "createdAt");
CREATE INDEX "GiftCardMovement_orderId_idx" ON "GiftCardMovement"("orderId");

ALTER TABLE "GiftCard" ADD CONSTRAINT "GiftCard_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GiftCard" ADD CONSTRAINT "GiftCard_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "GiftCard" ADD CONSTRAINT "GiftCard_issuedAtLocationId_fkey" FOREIGN KEY ("issuedAtLocationId") REFERENCES "StoreLocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "GiftCard" ADD CONSTRAINT "GiftCard_issuedByUserId_fkey" FOREIGN KEY ("issuedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "GiftCardMovement" ADD CONSTRAINT "GiftCardMovement_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GiftCardMovement" ADD CONSTRAINT "GiftCardMovement_giftCardId_fkey" FOREIGN KEY ("giftCardId") REFERENCES "GiftCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GiftCardMovement" ADD CONSTRAINT "GiftCardMovement_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "GiftCardMovement" ADD CONSTRAINT "GiftCardMovement_storeLocationId_fkey" FOREIGN KEY ("storeLocationId") REFERENCES "StoreLocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "GiftCardMovement" ADD CONSTRAINT "GiftCardMovement_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

DO $$
DECLARE
  trojani_store_id INTEGER;
  gift_product_id INTEGER;
BEGIN
  SELECT id INTO trojani_store_id FROM "Store" WHERE lower(name) = 'trojani' ORDER BY id LIMIT 1;
  IF trojani_store_id IS NOT NULL THEN
    SELECT id INTO gift_product_id FROM "Product"
    WHERE "storeId" = trojani_store_id AND "deletedAt" IS NULL AND "type" = 'GIFT_CARD'
    LIMIT 1;
    IF gift_product_id IS NULL THEN
      INSERT INTO "Product" (title, description, "storeId", "createdAt", published, slug, "inventoryPolicy", "lowStockThreshold", type, "trackInventory")
      VALUES ('Gift Card', 'Gift card para utilizar en compras futuras.', trojani_store_id, CURRENT_TIMESTAMP, false, 'gift-card', 'UNTRACKED', 0, 'GIFT_CARD', false)
      RETURNING id INTO gift_product_id;
      INSERT INTO "ProductVariant" ("productId", sku, price)
      VALUES
        (gift_product_id, 'GC-25000', 25000),
        (gift_product_id, 'GC-50000', 50000),
        (gift_product_id, 'GC-100000', 100000);
    END IF;
  END IF;
END $$;

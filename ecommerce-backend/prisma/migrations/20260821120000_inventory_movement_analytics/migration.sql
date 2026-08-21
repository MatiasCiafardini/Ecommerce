CREATE TYPE "ProductInventoryPolicy" AS ENUM ('UNCLASSIFIED', 'RESTOCK', 'NO_RESTOCK', 'UNTRACKED');

CREATE TYPE "InventoryMovementType" AS ENUM (
  'OPENING_BALANCE',
  'INITIAL_LOAD',
  'MANUAL_ADJUSTMENT',
  'RESERVATION',
  'RESERVATION_RELEASE',
  'SALE',
  'CANCELLATION_RESTOCK',
  'RETURN_RESTOCK',
  'EXCHANGE_OUT',
  'ORDER_EDIT',
  'TRIAL_RESERVATION',
  'TRIAL_RELEASE',
  'TRIAL_SALE',
  'SYSTEM_CORRECTION'
);

ALTER TABLE "Product"
ADD COLUMN "inventoryPolicy" "ProductInventoryPolicy" NOT NULL DEFAULT 'UNCLASSIFIED',
ADD COLUMN "lowStockThreshold" INTEGER NOT NULL DEFAULT 3;

ALTER TABLE "Product" ALTER COLUMN "inventoryPolicy" SET DEFAULT 'RESTOCK';

CREATE TABLE "InventoryMovement" (
  "id" SERIAL NOT NULL,
  "storeId" INTEGER NOT NULL,
  "variantId" INTEGER NOT NULL,
  "actorUserId" INTEGER,
  "actorEmail" TEXT,
  "actorName" TEXT,
  "type" "InventoryMovementType" NOT NULL,
  "origin" TEXT NOT NULL,
  "referenceType" TEXT,
  "referenceId" INTEGER,
  "reason" TEXT,
  "quantityDelta" INTEGER NOT NULL,
  "reservedDelta" INTEGER NOT NULL,
  "quantityBefore" INTEGER NOT NULL,
  "quantityAfter" INTEGER NOT NULL,
  "reservedBefore" INTEGER NOT NULL,
  "reservedAfter" INTEGER NOT NULL,
  "approximate" BOOLEAN NOT NULL DEFAULT false,
  "idempotencyKey" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InventoryMovement_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "InventoryMovement_storeId_idempotencyKey_key" ON "InventoryMovement"("storeId", "idempotencyKey");
CREATE INDEX "InventoryMovement_storeId_createdAt_idx" ON "InventoryMovement"("storeId", "createdAt");
CREATE INDEX "InventoryMovement_storeId_variantId_createdAt_idx" ON "InventoryMovement"("storeId", "variantId", "createdAt");
CREATE INDEX "InventoryMovement_storeId_type_createdAt_idx" ON "InventoryMovement"("storeId", "type", "createdAt");
CREATE INDEX "InventoryMovement_referenceType_referenceId_idx" ON "InventoryMovement"("referenceType", "referenceId");
CREATE INDEX "InventoryMovement_actorUserId_idx" ON "InventoryMovement"("actorUserId");

ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "InventoryMovement" (
  "storeId", "variantId", "type", "origin", "quantityDelta", "reservedDelta",
  "quantityBefore", "quantityAfter", "reservedBefore", "reservedAfter",
  "approximate", "idempotencyKey", "metadata"
)
SELECT
  i."storeId",
  i."variantId",
  'OPENING_BALANCE'::"InventoryMovementType",
  'migration',
  i."quantity",
  i."reserved",
  0,
  i."quantity",
  0,
  i."reserved",
  true,
  'opening:' || i."storeId" || ':' || i."variantId",
  jsonb_build_object('note', 'Saldo inicial al habilitar el historial; antiguedad previa desconocida')
FROM "Inventory" i;

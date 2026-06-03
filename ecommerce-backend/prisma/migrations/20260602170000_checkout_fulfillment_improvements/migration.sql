ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'ready_for_pickup';
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'picked_up';

ALTER TABLE "Order"
  ADD COLUMN IF NOT EXISTS "customerNotesSnapshot" TEXT,
  ADD COLUMN IF NOT EXISTS "reservationExpiresAt" TIMESTAMP(3);

ALTER TABLE "StoreShippingMethod"
  ADD COLUMN IF NOT EXISTS "pickupAddress" TEXT,
  ADD COLUMN IF NOT EXISTS "pickupHours" TEXT,
  ADD COLUMN IF NOT EXISTS "pickupInstructions" TEXT;

CREATE INDEX IF NOT EXISTS "Order_storeId_status_reservationExpiresAt_idx"
  ON "Order"("storeId", "status", "reservationExpiresAt");

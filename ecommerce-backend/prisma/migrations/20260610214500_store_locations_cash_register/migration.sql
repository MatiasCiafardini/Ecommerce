CREATE TABLE IF NOT EXISTS "StoreLocation" (
  "id" SERIAL NOT NULL,
  "storeId" INTEGER NOT NULL,
  "name" TEXT NOT NULL,
  "address" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "StoreLocation_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'StoreLocation_storeId_fkey'
  ) THEN
    ALTER TABLE "StoreLocation"
    ADD CONSTRAINT "StoreLocation_storeId_fkey"
    FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "StoreLocation_storeId_name_key"
ON "StoreLocation"("storeId", "name");

CREATE INDEX IF NOT EXISTS "StoreLocation_storeId_active_idx"
ON "StoreLocation"("storeId", "active");

ALTER TABLE "User"
ADD COLUMN IF NOT EXISTS "storeLocationId" INTEGER;

ALTER TABLE "Order"
ADD COLUMN IF NOT EXISTS "storeLocationId" INTEGER,
ADD COLUMN IF NOT EXISTS "cashRegisterId" INTEGER;

ALTER TABLE "Payment"
ADD COLUMN IF NOT EXISTS "storeLocationId" INTEGER,
ADD COLUMN IF NOT EXISTS "cashRegisterId" INTEGER;

ALTER TABLE "CurrentAccountMovement"
ADD COLUMN IF NOT EXISTS "storeLocationId" INTEGER;

ALTER TABLE "CashRegisterSession"
ADD COLUMN IF NOT EXISTS "storeLocationId" INTEGER;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'User_storeLocationId_fkey'
  ) THEN
    ALTER TABLE "User"
    ADD CONSTRAINT "User_storeLocationId_fkey"
    FOREIGN KEY ("storeLocationId") REFERENCES "StoreLocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Order_storeLocationId_fkey'
  ) THEN
    ALTER TABLE "Order"
    ADD CONSTRAINT "Order_storeLocationId_fkey"
    FOREIGN KEY ("storeLocationId") REFERENCES "StoreLocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Order_cashRegisterId_fkey'
  ) THEN
    ALTER TABLE "Order"
    ADD CONSTRAINT "Order_cashRegisterId_fkey"
    FOREIGN KEY ("cashRegisterId") REFERENCES "CashRegisterSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Payment_storeLocationId_fkey'
  ) THEN
    ALTER TABLE "Payment"
    ADD CONSTRAINT "Payment_storeLocationId_fkey"
    FOREIGN KEY ("storeLocationId") REFERENCES "StoreLocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Payment_cashRegisterId_fkey'
  ) THEN
    ALTER TABLE "Payment"
    ADD CONSTRAINT "Payment_cashRegisterId_fkey"
    FOREIGN KEY ("cashRegisterId") REFERENCES "CashRegisterSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'CurrentAccountMovement_storeLocationId_fkey'
  ) THEN
    ALTER TABLE "CurrentAccountMovement"
    ADD CONSTRAINT "CurrentAccountMovement_storeLocationId_fkey"
    FOREIGN KEY ("storeLocationId") REFERENCES "StoreLocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'CurrentAccountMovement_cashRegisterId_fkey'
  ) THEN
    ALTER TABLE "CurrentAccountMovement"
    ADD CONSTRAINT "CurrentAccountMovement_cashRegisterId_fkey"
    FOREIGN KEY ("cashRegisterId") REFERENCES "CashRegisterSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'CashRegisterSession_storeLocationId_fkey'
  ) THEN
    ALTER TABLE "CashRegisterSession"
    ADD CONSTRAINT "CashRegisterSession_storeLocationId_fkey"
    FOREIGN KEY ("storeLocationId") REFERENCES "StoreLocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "User_storeId_storeLocationId_idx"
ON "User"("storeId", "storeLocationId");

CREATE INDEX IF NOT EXISTS "Order_storeId_storeLocationId_idx"
ON "Order"("storeId", "storeLocationId");

CREATE INDEX IF NOT EXISTS "Order_cashRegisterId_idx"
ON "Order"("cashRegisterId");

CREATE INDEX IF NOT EXISTS "Payment_storeId_storeLocationId_idx"
ON "Payment"("storeId", "storeLocationId");

CREATE INDEX IF NOT EXISTS "Payment_cashRegisterId_idx"
ON "Payment"("cashRegisterId");

CREATE INDEX IF NOT EXISTS "CurrentAccountMovement_storeId_storeLocationId_idx"
ON "CurrentAccountMovement"("storeId", "storeLocationId");

CREATE INDEX IF NOT EXISTS "CurrentAccountMovement_cashRegisterId_idx"
ON "CurrentAccountMovement"("cashRegisterId");

CREATE INDEX IF NOT EXISTS "CashRegisterSession_storeId_storeLocationId_mode_openedAt_idx"
ON "CashRegisterSession"("storeId", "storeLocationId", "mode", "openedAt");

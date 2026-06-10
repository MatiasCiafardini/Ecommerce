ALTER TABLE "Store"
ADD COLUMN IF NOT EXISTS "cashRegisterMode" TEXT NOT NULL DEFAULT 'automatic';

CREATE TABLE IF NOT EXISTS "CashRegisterSession" (
  "id" SERIAL NOT NULL,
  "storeId" INTEGER NOT NULL,
  "mode" TEXT NOT NULL DEFAULT 'automatic',
  "businessDate" TIMESTAMP(3),
  "openingAmount" DECIMAL(10, 2) NOT NULL DEFAULT 0,
  "expectedAmount" DECIMAL(10, 2),
  "closingAmount" DECIMAL(10, 2),
  "receivedAmount" DECIMAL(10, 2),
  "differenceAmount" DECIMAL(10, 2),
  "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "closedAt" TIMESTAMP(3),
  "openedByUserId" INTEGER,
  "closedByUserId" INTEGER,
  "notes" TEXT,
  "summary" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "CashRegisterSession_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'CashRegisterSession_storeId_fkey'
  ) THEN
    ALTER TABLE "CashRegisterSession"
    ADD CONSTRAINT "CashRegisterSession_storeId_fkey"
    FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "CashRegisterSession_storeId_mode_openedAt_idx"
ON "CashRegisterSession"("storeId", "mode", "openedAt");

CREATE INDEX IF NOT EXISTS "CashRegisterSession_storeId_closedAt_idx"
ON "CashRegisterSession"("storeId", "closedAt");

CREATE INDEX IF NOT EXISTS "CashRegisterSession_storeId_businessDate_idx"
ON "CashRegisterSession"("storeId", "businessDate");

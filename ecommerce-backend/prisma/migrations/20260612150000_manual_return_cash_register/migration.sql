-- Add cash register context to manual returns so paid exchange differences can be reported in cash summaries.
ALTER TABLE "ManualReturn"
  ADD COLUMN "storeLocationId" INTEGER,
  ADD COLUMN "cashRegisterId" INTEGER,
  ADD COLUMN "settlementMethod" TEXT;

ALTER TABLE "ManualReturn"
  ADD CONSTRAINT "ManualReturn_storeLocationId_fkey"
  FOREIGN KEY ("storeLocationId") REFERENCES "StoreLocation"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ManualReturn"
  ADD CONSTRAINT "ManualReturn_cashRegisterId_fkey"
  FOREIGN KEY ("cashRegisterId") REFERENCES "CashRegisterSession"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "ManualReturn_storeId_storeLocationId_idx" ON "ManualReturn"("storeId", "storeLocationId");
CREATE INDEX "ManualReturn_cashRegisterId_idx" ON "ManualReturn"("cashRegisterId");

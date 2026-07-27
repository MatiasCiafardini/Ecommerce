ALTER TABLE "ManualReturn"
  ADD COLUMN "customerId" INTEGER,
  ADD COLUMN "currentAccountId" INTEGER,
  ADD COLUMN "returnedPaymentMethod" TEXT,
  ADD COLUMN "returnedDiscountApplied" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "exchangeDiscountApplied" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "CurrentAccountMovement"
  ADD COLUMN "manualReturnId" INTEGER;

CREATE TABLE "ManualReturnEvent" (
  "id" SERIAL NOT NULL,
  "storeId" INTEGER NOT NULL,
  "manualReturnId" INTEGER NOT NULL,
  "type" TEXT NOT NULL,
  "message" TEXT,
  "actorId" INTEGER,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ManualReturnEvent_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "ManualReturn" ADD CONSTRAINT "ManualReturn_customerId_fkey"
  FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ManualReturn" ADD CONSTRAINT "ManualReturn_currentAccountId_fkey"
  FOREIGN KEY ("currentAccountId") REFERENCES "CurrentAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CurrentAccountMovement" ADD CONSTRAINT "CurrentAccountMovement_manualReturnId_fkey"
  FOREIGN KEY ("manualReturnId") REFERENCES "ManualReturn"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ManualReturnEvent" ADD CONSTRAINT "ManualReturnEvent_manualReturnId_fkey"
  FOREIGN KEY ("manualReturnId") REFERENCES "ManualReturn"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ManualReturnEvent" ADD CONSTRAINT "ManualReturnEvent_actorId_fkey"
  FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "ManualReturn_customerId_idx" ON "ManualReturn"("customerId");
CREATE INDEX "ManualReturn_currentAccountId_idx" ON "ManualReturn"("currentAccountId");
CREATE INDEX "CurrentAccountMovement_manualReturnId_idx" ON "CurrentAccountMovement"("manualReturnId");
CREATE INDEX "ManualReturnEvent_storeId_createdAt_idx" ON "ManualReturnEvent"("storeId", "createdAt");
CREATE INDEX "ManualReturnEvent_manualReturnId_createdAt_idx" ON "ManualReturnEvent"("manualReturnId", "createdAt");

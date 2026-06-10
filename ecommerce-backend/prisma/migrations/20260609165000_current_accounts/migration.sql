-- Cuenta corriente por cliente y tienda, con movimientos auditables.
CREATE TYPE "CurrentAccountMovementType" AS ENUM (
  'SALE',
  'PAYMENT',
  'ADJUSTMENT_POSITIVE',
  'ADJUSTMENT_NEGATIVE',
  'CREDIT_NOTE'
);

CREATE TABLE "CurrentAccount" (
  "id" SERIAL NOT NULL,
  "storeId" INTEGER NOT NULL,
  "customerId" INTEGER NOT NULL,
  "balance" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "lastMovementAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "CurrentAccount_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CurrentAccountMovement" (
  "id" SERIAL NOT NULL,
  "storeId" INTEGER NOT NULL,
  "accountId" INTEGER NOT NULL,
  "customerId" INTEGER NOT NULL,
  "orderId" INTEGER,
  "cashRegisterId" INTEGER,
  "type" "CurrentAccountMovementType" NOT NULL,
  "amount" DECIMAL(10,2) NOT NULL,
  "paymentMethod" TEXT,
  "description" TEXT,
  "createdByUserId" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "balanceAfter" DECIMAL(10,2) NOT NULL,

  CONSTRAINT "CurrentAccountMovement_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CurrentAccount_storeId_customerId_key" ON "CurrentAccount"("storeId", "customerId");
CREATE INDEX "CurrentAccount_storeId_balance_idx" ON "CurrentAccount"("storeId", "balance");
CREATE INDEX "CurrentAccount_customerId_idx" ON "CurrentAccount"("customerId");
CREATE INDEX "CurrentAccountMovement_storeId_customerId_createdAt_idx" ON "CurrentAccountMovement"("storeId", "customerId", "createdAt");
CREATE INDEX "CurrentAccountMovement_storeId_type_idx" ON "CurrentAccountMovement"("storeId", "type");
CREATE INDEX "CurrentAccountMovement_orderId_idx" ON "CurrentAccountMovement"("orderId");
CREATE INDEX "CurrentAccountMovement_accountId_createdAt_idx" ON "CurrentAccountMovement"("accountId", "createdAt");

ALTER TABLE "CurrentAccount"
ADD CONSTRAINT "CurrentAccount_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CurrentAccount"
ADD CONSTRAINT "CurrentAccount_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CurrentAccountMovement"
ADD CONSTRAINT "CurrentAccountMovement_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CurrentAccountMovement"
ADD CONSTRAINT "CurrentAccountMovement_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "CurrentAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CurrentAccountMovement"
ADD CONSTRAINT "CurrentAccountMovement_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CurrentAccountMovement"
ADD CONSTRAINT "CurrentAccountMovement_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CurrentAccountMovement"
ADD CONSTRAINT "CurrentAccountMovement_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "ProductTrial" (
    "id" SERIAL NOT NULL,
    "storeId" INTEGER NOT NULL,
    "storeLocationId" INTEGER,
    "accountId" INTEGER NOT NULL,
    "customerId" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "notes" TEXT,
    "createdByUserId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    CONSTRAINT "ProductTrial_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProductTrialItem" (
    "id" SERIAL NOT NULL,
    "storeId" INTEGER NOT NULL,
    "trialId" INTEGER NOT NULL,
    "variantId" INTEGER NOT NULL,
    "orderId" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "price" DECIMAL(10,2) NOT NULL,
    "resolvedAt" TIMESTAMP(3),
    "resolvedByUserId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ProductTrialItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProductTrialEvent" (
    "id" SERIAL NOT NULL,
    "storeId" INTEGER NOT NULL,
    "trialId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "actorId" INTEGER,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProductTrialEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ProductTrial_storeId_storeLocationId_status_idx" ON "ProductTrial"("storeId", "storeLocationId", "status");
CREATE INDEX "ProductTrial_accountId_createdAt_idx" ON "ProductTrial"("accountId", "createdAt");
CREATE INDEX "ProductTrial_customerId_idx" ON "ProductTrial"("customerId");
CREATE INDEX "ProductTrialItem_trialId_status_idx" ON "ProductTrialItem"("trialId", "status");
CREATE INDEX "ProductTrialItem_storeId_variantId_status_idx" ON "ProductTrialItem"("storeId", "variantId", "status");
CREATE INDEX "ProductTrialItem_orderId_idx" ON "ProductTrialItem"("orderId");
CREATE INDEX "ProductTrialEvent_trialId_createdAt_idx" ON "ProductTrialEvent"("trialId", "createdAt");
CREATE INDEX "ProductTrialEvent_storeId_type_idx" ON "ProductTrialEvent"("storeId", "type");

ALTER TABLE "ProductTrial" ADD CONSTRAINT "ProductTrial_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductTrial" ADD CONSTRAINT "ProductTrial_storeLocationId_fkey" FOREIGN KEY ("storeLocationId") REFERENCES "StoreLocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProductTrial" ADD CONSTRAINT "ProductTrial_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "CurrentAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductTrial" ADD CONSTRAINT "ProductTrial_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductTrial" ADD CONSTRAINT "ProductTrial_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProductTrialItem" ADD CONSTRAINT "ProductTrialItem_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductTrialItem" ADD CONSTRAINT "ProductTrialItem_trialId_fkey" FOREIGN KEY ("trialId") REFERENCES "ProductTrial"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductTrialItem" ADD CONSTRAINT "ProductTrialItem_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProductTrialItem" ADD CONSTRAINT "ProductTrialItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProductTrialEvent" ADD CONSTRAINT "ProductTrialEvent_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductTrialEvent" ADD CONSTRAINT "ProductTrialEvent_trialId_fkey" FOREIGN KEY ("trialId") REFERENCES "ProductTrial"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CurrentAccount"
ADD COLUMN "deletedAt" TIMESTAMP(3);

CREATE INDEX "CurrentAccount_storeId_deletedAt_idx"
ON "CurrentAccount"("storeId", "deletedAt");

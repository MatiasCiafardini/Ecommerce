ALTER TABLE "Customer"
ADD COLUMN "googleId" TEXT;

CREATE UNIQUE INDEX "Customer_storeId_googleId_key"
ON "Customer"("storeId", "googleId");

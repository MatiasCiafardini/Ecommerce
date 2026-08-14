ALTER TABLE "Product" ADD COLUMN "brand" TEXT;

CREATE INDEX "Product_storeId_brand_idx" ON "Product"("storeId", "brand");

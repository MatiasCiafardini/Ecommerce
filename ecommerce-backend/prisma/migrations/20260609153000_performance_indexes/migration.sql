-- Add indexes used by public storefront product lists and detail pages.
CREATE INDEX "ProductCategory_categoryId_productId_idx" ON "ProductCategory"("categoryId", "productId");

CREATE INDEX "ProductImage_productId_position_idx" ON "ProductImage"("productId", "position");

CREATE INDEX "ProductVariant_productId_deletedAt_idx" ON "ProductVariant"("productId", "deletedAt");

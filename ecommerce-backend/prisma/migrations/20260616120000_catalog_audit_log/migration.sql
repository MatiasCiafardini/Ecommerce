-- CreateTable
CREATE TABLE "CatalogAuditLog" (
    "id" SERIAL NOT NULL,
    "storeId" INTEGER NOT NULL,
    "productId" INTEGER,
    "variantId" INTEGER,
    "actorUserId" INTEGER,
    "actorEmail" TEXT,
    "actorName" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" INTEGER,
    "before" JSONB,
    "after" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CatalogAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CatalogAuditLog_storeId_createdAt_idx" ON "CatalogAuditLog"("storeId", "createdAt");

-- CreateIndex
CREATE INDEX "CatalogAuditLog_storeId_productId_createdAt_idx" ON "CatalogAuditLog"("storeId", "productId", "createdAt");

-- CreateIndex
CREATE INDEX "CatalogAuditLog_storeId_variantId_createdAt_idx" ON "CatalogAuditLog"("storeId", "variantId", "createdAt");

-- CreateIndex
CREATE INDEX "CatalogAuditLog_actorUserId_idx" ON "CatalogAuditLog"("actorUserId");

-- CreateIndex
CREATE INDEX "CatalogAuditLog_action_idx" ON "CatalogAuditLog"("action");

-- AddForeignKey
ALTER TABLE "CatalogAuditLog" ADD CONSTRAINT "CatalogAuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatalogAuditLog" ADD CONSTRAINT "CatalogAuditLog_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatalogAuditLog" ADD CONSTRAINT "CatalogAuditLog_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatalogAuditLog" ADD CONSTRAINT "CatalogAuditLog_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

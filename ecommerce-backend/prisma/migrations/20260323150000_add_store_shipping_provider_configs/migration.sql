-- Additive multi-tenant shipping provider configuration and quote hardening

ALTER TABLE "Order"
ADD COLUMN "shippingProviderConfigId" TEXT,
ADD COLUMN "shippingQuoteId" TEXT;

ALTER TABLE "Shipment"
ADD COLUMN "providerConfigId" TEXT;

CREATE TABLE "StoreShippingProviderConfig" (
  "id" TEXT NOT NULL,
  "storeId" INTEGER NOT NULL,
  "provider" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "mode" TEXT DEFAULT 'DEFAULT',
  "email" TEXT,
  "password" TEXT,
  "agreement" TEXT,
  "apiKey" TEXT,
  "secretKey" TEXT,
  "originBranch" TEXT,
  "originAddressId" TEXT,
  "senderName" TEXT,
  "senderPhone" TEXT,
  "senderEmail" TEXT,
  "companyName" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "StoreShippingProviderConfig_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ShippingQuote" (
  "id" TEXT NOT NULL,
  "storeId" INTEGER NOT NULL,
  "cartId" INTEGER NOT NULL,
  "customerId" INTEGER NOT NULL,
  "provider" TEXT NOT NULL,
  "method" TEXT NOT NULL,
  "price" DECIMAL(10,2) NOT NULL,
  "estimatedDays" INTEGER NOT NULL,
  "postalCode" TEXT NOT NULL,
  "state" TEXT,
  "city" TEXT,
  "country" TEXT,
  "weight" DOUBLE PRECISION,
  "declaredValue" DECIMAL(10,2),
  "carrierId" TEXT,
  "carrierName" TEXT,
  "serviceCode" TEXT,
  "modalityCode" TEXT,
  "dispatchType" TEXT,
  "branchId" TEXT,
  "sellerCost" DECIMAL(10,2),
  "providerConfigId" TEXT,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "consumedAt" TIMESTAMP(3),
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ShippingQuote_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StoreShippingProviderConfig_storeId_provider_key"
ON "StoreShippingProviderConfig"("storeId", "provider");

CREATE INDEX "StoreShippingProviderConfig_storeId_enabled_isDefault_idx"
ON "StoreShippingProviderConfig"("storeId", "enabled", "isDefault");

CREATE INDEX "StoreShippingProviderConfig_storeId_provider_idx"
ON "StoreShippingProviderConfig"("storeId", "provider");

CREATE INDEX "ShippingQuote_storeId_customerId_cartId_createdAt_idx"
ON "ShippingQuote"("storeId", "customerId", "cartId", "createdAt");

CREATE INDEX "ShippingQuote_storeId_expiresAt_idx"
ON "ShippingQuote"("storeId", "expiresAt");

CREATE INDEX "ShippingQuote_providerConfigId_idx"
ON "ShippingQuote"("providerConfigId");

CREATE INDEX "Order_shippingProviderConfigId_idx"
ON "Order"("shippingProviderConfigId");

CREATE INDEX "Order_shippingQuoteId_idx"
ON "Order"("shippingQuoteId");

CREATE INDEX "Shipment_providerConfigId_idx"
ON "Shipment"("providerConfigId");

ALTER TABLE "StoreShippingProviderConfig"
ADD CONSTRAINT "StoreShippingProviderConfig_storeId_fkey"
FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ShippingQuote"
ADD CONSTRAINT "ShippingQuote_storeId_fkey"
FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ShippingQuote"
ADD CONSTRAINT "ShippingQuote_providerConfigId_fkey"
FOREIGN KEY ("providerConfigId") REFERENCES "StoreShippingProviderConfig"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Order"
ADD CONSTRAINT "Order_shippingProviderConfigId_fkey"
FOREIGN KEY ("shippingProviderConfigId") REFERENCES "StoreShippingProviderConfig"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Order"
ADD CONSTRAINT "Order_shippingQuoteId_fkey"
FOREIGN KEY ("shippingQuoteId") REFERENCES "ShippingQuote"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Shipment"
ADD CONSTRAINT "Shipment_providerConfigId_fkey"
FOREIGN KEY ("providerConfigId") REFERENCES "StoreShippingProviderConfig"("id") ON DELETE SET NULL ON UPDATE CASCADE;

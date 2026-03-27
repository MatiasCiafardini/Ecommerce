ALTER TABLE "Order"
ADD COLUMN "shippingCarrierId" TEXT,
ADD COLUMN "shippingCarrierName" TEXT,
ADD COLUMN "shippingServiceCode" TEXT,
ADD COLUMN "shippingModalityCode" TEXT,
ADD COLUMN "shippingDispatchType" TEXT,
ADD COLUMN "shippingBranchId" TEXT;

ALTER TABLE "Shipment"
ADD COLUMN "carrier" TEXT,
ADD COLUMN "cost" DECIMAL(10,2),
ADD COLUMN "conditionCode" TEXT,
ADD COLUMN "providerPayload" JSONB;

CREATE TABLE "InboundWebhookEvent" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "payloadHash" TEXT NOT NULL,
    "externalId" TEXT,
    "payload" JSONB NOT NULL,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "InboundWebhookEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "InboundWebhookEvent_provider_payloadHash_key" ON "InboundWebhookEvent"("provider", "payloadHash");
CREATE INDEX "InboundWebhookEvent_provider_event_idx" ON "InboundWebhookEvent"("provider", "event");

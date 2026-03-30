ALTER TABLE "Return"
ADD COLUMN "customerShipmentCarrier" TEXT,
ADD COLUMN "customerShipmentTracking" TEXT,
ADD COLUMN "customerShipmentProofUrl" TEXT,
ADD COLUMN "shippedAt" TIMESTAMP(3);

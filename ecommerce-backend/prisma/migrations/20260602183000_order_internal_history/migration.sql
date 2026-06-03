CREATE TABLE IF NOT EXISTS "OrderEvent" (
  "id" SERIAL PRIMARY KEY,
  "storeId" INTEGER NOT NULL,
  "orderId" INTEGER NOT NULL,
  "type" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "message" TEXT,
  "actorType" TEXT,
  "actorId" INTEGER,
  "actorName" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OrderEvent_orderId_fkey"
    FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "OrderEvent_storeId_orderId_createdAt_idx"
  ON "OrderEvent"("storeId", "orderId", "createdAt");

CREATE INDEX IF NOT EXISTS "OrderEvent_storeId_type_idx"
  ON "OrderEvent"("storeId", "type");

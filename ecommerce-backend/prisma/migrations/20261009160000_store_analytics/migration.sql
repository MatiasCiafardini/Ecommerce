CREATE TABLE "AnalyticsSession" (
  "storeId" INTEGER NOT NULL REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "id" UUID NOT NULL, "tokenHash" TEXT NOT NULL,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "device" TEXT NOT NULL, "source" TEXT NOT NULL,
  "medium" TEXT, "campaign" TEXT, "referrer" TEXT,
  PRIMARY KEY ("storeId", "id")
);
CREATE INDEX "AnalyticsSession_storeId_startedAt_idx" ON "AnalyticsSession"("storeId", "startedAt");
CREATE TABLE "AnalyticsEvent" (
  "storeId" INTEGER NOT NULL, "id" UUID NOT NULL, "sessionId" UUID NOT NULL,
  "type" TEXT NOT NULL, "occurredAt" TIMESTAMP(3) NOT NULL,
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "path" TEXT NOT NULL DEFAULT '/', "productId" INTEGER, "quantity" INTEGER,
  "amount" DECIMAL(12,2), "category" TEXT,
  PRIMARY KEY ("storeId", "id"),
  FOREIGN KEY ("storeId", "sessionId") REFERENCES "AnalyticsSession"("storeId", "id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "AnalyticsEvent_storeId_sessionId_occurredAt_idx" ON "AnalyticsEvent"("storeId", "sessionId", "occurredAt");
CREATE INDEX "AnalyticsEvent_storeId_type_receivedAt_idx" ON "AnalyticsEvent"("storeId", "type", "receivedAt");
CREATE TABLE "AnalyticsOrder" (
  "storeId" INTEGER NOT NULL, "orderId" INTEGER NOT NULL UNIQUE REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "sessionId" UUID NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL,
  "paidAt" TIMESTAMP(3), "amount" DECIMAL(12,2) NOT NULL,
  PRIMARY KEY ("storeId", "orderId"),
  FOREIGN KEY ("storeId", "sessionId") REFERENCES "AnalyticsSession"("storeId", "id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "AnalyticsOrder_storeId_sessionId_idx" ON "AnalyticsOrder"("storeId", "sessionId");

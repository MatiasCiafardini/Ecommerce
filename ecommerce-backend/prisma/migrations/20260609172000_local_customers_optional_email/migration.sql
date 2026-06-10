-- Allow local/admin customers without email while keeping email unique per store when present.
ALTER TABLE "Customer"
ALTER COLUMN "email" DROP NOT NULL;

ALTER TABLE "Customer"
ADD COLUMN "document" TEXT,
ADD COLUMN "notes" TEXT;

CREATE INDEX "Customer_storeId_phone_idx" ON "Customer"("storeId", "phone");
CREATE INDEX "Customer_storeId_document_idx" ON "Customer"("storeId", "document");

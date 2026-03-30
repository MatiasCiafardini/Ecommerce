ALTER TYPE "ReturnStatus" ADD VALUE IF NOT EXISTS 'received';
ALTER TYPE "ReturnStatus" ADD VALUE IF NOT EXISTS 'resolved';

ALTER TABLE "Return"
ADD COLUMN "adminInstructions" TEXT,
ADD COLUMN "adminNotes" TEXT,
ADD COLUMN "approvedAt" TIMESTAMP(3),
ADD COLUMN "receivedAt" TIMESTAMP(3),
ADD COLUMN "resolvedAt" TIMESTAMP(3);

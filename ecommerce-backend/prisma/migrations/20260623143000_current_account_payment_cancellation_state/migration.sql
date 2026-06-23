ALTER TABLE "CurrentAccountMovement"
ADD COLUMN "cancelledAt" TIMESTAMP(3),
ADD COLUMN "cancelledByUserId" INTEGER,
ADD COLUMN "cancellationReason" TEXT,
ADD COLUMN "cancellationMovementId" INTEGER;

CREATE INDEX "CurrentAccountMovement_cancelledAt_idx"
ON "CurrentAccountMovement"("cancelledAt");

CREATE INDEX "CurrentAccountMovement_cancellationMovementId_idx"
ON "CurrentAccountMovement"("cancellationMovementId");

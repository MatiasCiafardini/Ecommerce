-- DropIndex
DROP INDEX "Order_customerId_idx";

-- DropIndex
DROP INDEX "Order_storeId_idx";

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "shippingCost" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "shippingMethod" TEXT,
ADD COLUMN     "shippingProvider" TEXT;

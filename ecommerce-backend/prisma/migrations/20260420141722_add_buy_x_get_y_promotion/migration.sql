-- AlterEnum
ALTER TYPE "DiscountType" ADD VALUE 'buy_x_get_y';

-- DropForeignKey
ALTER TABLE "Refund" DROP CONSTRAINT "Refund_returnId_fkey";

-- AlterTable
ALTER TABLE "Discount" ADD COLUMN     "buyQuantity" INTEGER,
ADD COLUMN     "getQuantity" INTEGER;

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "discountAmount" DECIMAL(10,2) NOT NULL DEFAULT 0;

-- AddForeignKey
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_returnId_fkey" FOREIGN KEY ("returnId") REFERENCES "Return"("id") ON DELETE SET NULL ON UPDATE CASCADE;

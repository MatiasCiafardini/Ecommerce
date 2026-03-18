/*
  Warnings:

  - You are about to drop the column `option1` on the `ProductVariant` table. All the data in the column will be lost.
  - You are about to drop the column `option2` on the `ProductVariant` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "ProductVariant" DROP COLUMN "option1",
DROP COLUMN "option2",
ADD COLUMN     "Color" TEXT,
ADD COLUMN     "Size" TEXT;

/*
  Warnings:

  - A unique constraint covering the columns `[storeId,variantId]` on the table `Inventory` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `storeId` to the `Inventory` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Inventory_variantId_key";

-- AlterTable
ALTER TABLE "Inventory" ADD COLUMN     "storeId" INTEGER NOT NULL;

-- CreateIndex
CREATE INDEX "Inventory_storeId_idx" ON "Inventory"("storeId");

-- CreateIndex
CREATE UNIQUE INDEX "Inventory_storeId_variantId_key" ON "Inventory"("storeId", "variantId");

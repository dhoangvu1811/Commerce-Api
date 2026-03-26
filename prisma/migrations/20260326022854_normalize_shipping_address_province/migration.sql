/*
  Warnings:

  - You are about to drop the column `address` on the `shipping_addresses` table. All the data in the column will be lost.
  - You are about to drop the column `city` on the `shipping_addresses` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "shipping_addresses" DROP COLUMN "address",
DROP COLUMN "city";

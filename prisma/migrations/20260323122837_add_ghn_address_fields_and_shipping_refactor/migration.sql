/*
  Warnings:

  - Added the required column `address_line` to the `shipping_addresses` table without a default value. This is not possible if the table is not empty.
  - Added the required column `district` to the `shipping_addresses` table without a default value. This is not possible if the table is not empty.
  - Added the required column `district_id` to the `shipping_addresses` table without a default value. This is not possible if the table is not empty.
  - Added the required column `full_address` to the `shipping_addresses` table without a default value. This is not possible if the table is not empty.
  - Added the required column `province_id` to the `shipping_addresses` table without a default value. This is not possible if the table is not empty.
  - Added the required column `ward` to the `shipping_addresses` table without a default value. This is not possible if the table is not empty.
  - Added the required column `ward_code` to the `shipping_addresses` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "shipping_addresses" ADD COLUMN     "address_line" VARCHAR(255) NOT NULL,
ADD COLUMN     "district" VARCHAR(100) NOT NULL,
ADD COLUMN     "district_id" INTEGER NOT NULL,
ADD COLUMN     "full_address" VARCHAR(700) NOT NULL,
ADD COLUMN     "province_id" INTEGER NOT NULL,
ADD COLUMN     "ward" VARCHAR(100) NOT NULL,
ADD COLUMN     "ward_code" VARCHAR(20) NOT NULL;

-- CreateIndex
CREATE INDEX "shipping_addresses_province_id_district_id_ward_code_idx" ON "shipping_addresses"("province_id", "district_id", "ward_code");

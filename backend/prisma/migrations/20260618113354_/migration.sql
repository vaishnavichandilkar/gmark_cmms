/*
  Warnings:

  - Added the required column `societyId` to the `Building` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Device" DROP CONSTRAINT "Device_buildingId_fkey";

-- DropForeignKey
ALTER TABLE "DeviceRegisterValue" DROP CONSTRAINT "DeviceRegisterValue_deviceId_fkey";

-- AlterTable
ALTER TABLE "Building" ADD COLUMN     "info" TEXT DEFAULT '0F - 0 flats',
ADD COLUMN     "societyId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Device" ADD COLUMN     "application" TEXT DEFAULT 'DOMESTIC_WATER_SYS',
ADD COLUMN     "controller" TEXT DEFAULT 'AIPCU',
ADD COLUMN     "macType" TEXT DEFAULT 'Primary MAC',
ADD COLUMN     "pumpType" TEXT DEFAULT 'WMP_BOOSTER_PUMP';

-- CreateTable
CREATE TABLE "Society" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Society_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Building" ADD CONSTRAINT "Building_societyId_fkey" FOREIGN KEY ("societyId") REFERENCES "Society"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Device" ADD CONSTRAINT "Device_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "Building"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeviceRegisterValue" ADD CONSTRAINT "DeviceRegisterValue_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("deviceId") ON DELETE CASCADE ON UPDATE CASCADE;

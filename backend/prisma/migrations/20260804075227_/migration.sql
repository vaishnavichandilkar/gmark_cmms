/*
  Warnings:

  - You are about to drop the column `assetCode` on the `Device` table. All the data in the column will be lost.
  - You are about to drop the column `company` on the `Device` table. All the data in the column will be lost.
  - You are about to drop the column `costCenter` on the `Device` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `Device` table. All the data in the column will be lost.
  - You are about to drop the column `facilityId` on the `Device` table. All the data in the column will be lost.
  - You are about to drop the column `headOfDepartment` on the `Device` table. All the data in the column will be lost.
  - You are about to drop the column `isLocationPart` on the `Device` table. All the data in the column will be lost.
  - You are about to drop the column `latitude` on the `Device` table. All the data in the column will be lost.
  - You are about to drop the column `longitude` on the `Device` table. All the data in the column will be lost.
  - You are about to drop the column `machineCategory` on the `Device` table. All the data in the column will be lost.
  - You are about to drop the column `machineCode` on the `Device` table. All the data in the column will be lost.
  - You are about to drop the column `machineOwner` on the `Device` table. All the data in the column will be lost.
  - You are about to drop the column `machineSubCategory` on the `Device` table. All the data in the column will be lost.
  - You are about to drop the column `maintenanceHead` on the `Device` table. All the data in the column will be lost.
  - You are about to drop the column `make` on the `Device` table. All the data in the column will be lost.
  - You are about to drop the column `modelNumber` on the `Device` table. All the data in the column will be lost.
  - You are about to drop the column `notes` on the `Device` table. All the data in the column will be lost.
  - You are about to drop the column `parentDeviceId` on the `Device` table. All the data in the column will be lost.
  - You are about to drop the column `serialNumber` on the `Device` table. All the data in the column will be lost.
  - You are about to drop the column `deviceId` on the `MachineDocument` table. All the data in the column will be lost.
  - You are about to drop the column `deviceId` on the `MachineSpecification` table. All the data in the column will be lost.
  - Added the required column `machineId` to the `MachineDocument` table without a default value. This is not possible if the table is not empty.
  - Added the required column `machineId` to the `MachineSpecification` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Device" DROP CONSTRAINT "Device_facilityId_fkey";

-- DropForeignKey
ALTER TABLE "Device" DROP CONSTRAINT "Device_parentDeviceId_fkey";

-- DropForeignKey
ALTER TABLE "MachineDocument" DROP CONSTRAINT "MachineDocument_deviceId_fkey";

-- DropForeignKey
ALTER TABLE "MachineSpecification" DROP CONSTRAINT "MachineSpecification_deviceId_fkey";

-- AlterTable
ALTER TABLE "Device" DROP COLUMN "assetCode",
DROP COLUMN "company",
DROP COLUMN "costCenter",
DROP COLUMN "description",
DROP COLUMN "facilityId",
DROP COLUMN "headOfDepartment",
DROP COLUMN "isLocationPart",
DROP COLUMN "latitude",
DROP COLUMN "longitude",
DROP COLUMN "machineCategory",
DROP COLUMN "machineCode",
DROP COLUMN "machineOwner",
DROP COLUMN "machineSubCategory",
DROP COLUMN "maintenanceHead",
DROP COLUMN "make",
DROP COLUMN "modelNumber",
DROP COLUMN "notes",
DROP COLUMN "parentDeviceId",
DROP COLUMN "serialNumber";

-- AlterTable
ALTER TABLE "MachineDocument" DROP COLUMN "deviceId",
ADD COLUMN     "machineId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "MachineSpecification" DROP COLUMN "deviceId",
ADD COLUMN     "machineId" INTEGER NOT NULL;

-- CreateTable
CREATE TABLE "Machine" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "deviceId" TEXT,
    "company" TEXT,
    "maintenanceHead" TEXT,
    "machineCode" TEXT,
    "serialNumber" TEXT,
    "make" TEXT,
    "modelNumber" TEXT,
    "machineCategory" TEXT,
    "machineSubCategory" TEXT,
    "description" TEXT,
    "assetCode" TEXT,
    "isLocationPart" BOOLEAN DEFAULT false,
    "costCenter" TEXT,
    "headOfDepartment" TEXT,
    "machineOwner" TEXT,
    "latitude" TEXT,
    "longitude" TEXT,
    "notes" TEXT,
    "buildingId" INTEGER,
    "facilityId" INTEGER,
    "parentMachineId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Machine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Machine_deviceId_key" ON "Machine"("deviceId");

-- AddForeignKey
ALTER TABLE "Machine" ADD CONSTRAINT "Machine_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "Building"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Machine" ADD CONSTRAINT "Machine_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "Facility"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Machine" ADD CONSTRAINT "Machine_parentMachineId_fkey" FOREIGN KEY ("parentMachineId") REFERENCES "Machine"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MachineDocument" ADD CONSTRAINT "MachineDocument_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "Machine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MachineSpecification" ADD CONSTRAINT "MachineSpecification_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "Machine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

/*
  Warnings:

  - You are about to drop the column `pressureSwitch5` on the `DeviceState` table. All the data in the column will be lost.
  - You are about to drop the column `vfdResetAfter` on the `DeviceState` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "DeviceState" DROP COLUMN "pressureSwitch5",
DROP COLUMN "vfdResetAfter";

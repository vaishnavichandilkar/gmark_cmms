/*
  Warnings:

  - You are about to drop the `MachineSpare` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "MachineSpare" DROP CONSTRAINT "MachineSpare_machineId_fkey";

-- DropTable
DROP TABLE "MachineSpare";

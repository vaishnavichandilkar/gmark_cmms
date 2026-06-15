-- AlterTable
ALTER TABLE "DeviceState" ADD COLUMN     "pressureSwitch5" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "vfdResetAfter" INTEGER NOT NULL DEFAULT 0;

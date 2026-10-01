-- AlterTable
ALTER TABLE "Device" ADD COLUMN     "historyEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "historyInterval" TEXT NOT NULL DEFAULT 'minute',
ADD COLUMN     "historyMode" TEXT NOT NULL DEFAULT 'Time-based',
ADD COLUMN     "lastHistoryAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "DeviceSnapshot" ADD COLUMN     "historyMode" TEXT DEFAULT 'Time-based';

-- AlterTable
ALTER TABLE "Machine" ADD COLUMN     "machineType" TEXT;

-- CreateTable
CREATE TABLE "DeviceAlert" (
    "id" SERIAL NOT NULL,
    "deviceId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'WARNING',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "triggerKey" TEXT,
    "intensity" INTEGER DEFAULT 1,
    "emailSent" BOOLEAN NOT NULL DEFAULT false,
    "emailSentTo" TEXT,
    "rolesNotified" TEXT,
    "isEscalated" BOOLEAN NOT NULL DEFAULT false,
    "escalationLevel" INTEGER NOT NULL DEFAULT 1,
    "lastEscalatedAt" TIMESTAMP(3),
    "acknowledgedAt" TIMESTAMP(3),
    "acknowledgedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "DeviceAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RegisterAlertConfig" (
    "id" SERIAL NOT NULL,
    "deviceId" TEXT NOT NULL,
    "registerNumber" INTEGER NOT NULL,
    "registerName" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "alertType" TEXT NOT NULL DEFAULT 'WARNING',
    "intensity" INTEGER NOT NULL DEFAULT 1,
    "conditionType" TEXT NOT NULL,
    "conditionValue" DOUBLE PRECISION NOT NULL,
    "message" TEXT NOT NULL,
    "sendEmail" BOOLEAN NOT NULL DEFAULT true,
    "emailRecipients" TEXT,
    "notifyRoles" TEXT DEFAULT 'SUPER_ADMIN,BUILDING_ADMIN,OPERATOR',
    "enableEscalation" BOOLEAN NOT NULL DEFAULT false,
    "escalationIntervalMinutes" INTEGER NOT NULL DEFAULT 60,
    "escalationChain" TEXT DEFAULT 'OPERATOR,BUILDING_ADMIN,SUPER_ADMIN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RegisterAlertConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DeviceAlert_deviceId_status_idx" ON "DeviceAlert"("deviceId", "status");

-- CreateIndex
CREATE INDEX "RegisterAlertConfig_deviceId_enabled_idx" ON "RegisterAlertConfig"("deviceId", "enabled");

-- CreateIndex
CREATE UNIQUE INDEX "RegisterAlertConfig_deviceId_registerNumber_key" ON "RegisterAlertConfig"("deviceId", "registerNumber");

-- CreateIndex
CREATE INDEX "DeviceSnapshot_deviceId_createdAt_idx" ON "DeviceSnapshot"("deviceId", "createdAt");

-- CreateIndex
CREATE INDEX "DeviceSnapshot_createdAt_idx" ON "DeviceSnapshot"("createdAt");

-- AddForeignKey
ALTER TABLE "DeviceAlert" ADD CONSTRAINT "DeviceAlert_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("deviceId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegisterAlertConfig" ADD CONSTRAINT "RegisterAlertConfig_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("deviceId") ON DELETE CASCADE ON UPDATE CASCADE;

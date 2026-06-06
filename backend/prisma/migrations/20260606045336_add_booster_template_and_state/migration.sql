-- AlterTable
ALTER TABLE "Device" ADD COLUMN     "cardNo" TEXT,
ADD COLUMN     "lastSeen" TIMESTAMP(3),
ADD COLUMN     "systemName" TEXT,
ADD COLUMN     "template" TEXT;

-- CreateTable
CREATE TABLE "DeviceSnapshot" (
    "id" SERIAL NOT NULL,
    "deviceId" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeviceSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeviceState" (
    "id" SERIAL NOT NULL,
    "deviceId" TEXT NOT NULL,
    "deviceActive" BOOLEAN NOT NULL,
    "motor1Status" BOOLEAN NOT NULL,
    "motor2Status" BOOLEAN NOT NULL,
    "inputPowerFaultType" INTEGER NOT NULL,
    "averageVoltage" DOUBLE PRECISION NOT NULL,
    "ryVoltage" DOUBLE PRECISION NOT NULL,
    "ybVoltage" DOUBLE PRECISION NOT NULL,
    "rbVoltage" DOUBLE PRECISION NOT NULL,
    "motor1RCurrent" DOUBLE PRECISION NOT NULL,
    "motor1YCurrent" DOUBLE PRECISION NOT NULL,
    "motor1BCurrent" DOUBLE PRECISION NOT NULL,
    "motor2RCurrent" DOUBLE PRECISION NOT NULL,
    "motor2YCurrent" DOUBLE PRECISION NOT NULL,
    "motor2BCurrent" DOUBLE PRECISION NOT NULL,
    "waterAvailable" BOOLEAN NOT NULL,
    "pressureBar" DOUBLE PRECISION NOT NULL,
    "transmitterConnected" BOOLEAN NOT NULL,
    "pressuremA" DOUBLE PRECISION NOT NULL,
    "pumpOnDelay" INTEGER NOT NULL,
    "nextFillingTime" INTEGER NOT NULL,
    "overloadResetDelay" INTEGER NOT NULL,
    "underloadResetDelay" INTEGER NOT NULL,
    "tankStatus" BOOLEAN NOT NULL,
    "pump1FaultType" INTEGER NOT NULL,
    "pump2FaultType" INTEGER NOT NULL,
    "motor1RunTime" INTEGER NOT NULL,
    "motor2RunTime" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeviceState_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DeviceState_deviceId_key" ON "DeviceState"("deviceId");

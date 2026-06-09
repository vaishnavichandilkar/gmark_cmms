-- AlterTable
ALTER TABLE "DeviceState" ADD COLUMN     "motor1ConfigActivate" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "motor2ConfigActivate" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "motor3ConfigActivate" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "motor4BCurrent" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "motor4ConfigActivate" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "motor4RCurrent" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "motor4RunTime" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "motor4Status" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "motor4YCurrent" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "pressureSwitch1" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "pressureSwitch2" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "pressureSwitch3" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "pressureSwitch4" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "pressureTankPressure" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "pump4FaultType" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "deviceActive" SET DEFAULT false,
ALTER COLUMN "motor1Status" SET DEFAULT false,
ALTER COLUMN "motor2Status" SET DEFAULT false,
ALTER COLUMN "inputPowerFaultType" SET DEFAULT 0,
ALTER COLUMN "averageVoltage" SET DEFAULT 0,
ALTER COLUMN "ryVoltage" SET DEFAULT 0,
ALTER COLUMN "ybVoltage" SET DEFAULT 0,
ALTER COLUMN "rbVoltage" SET DEFAULT 0,
ALTER COLUMN "motor1RCurrent" SET DEFAULT 0,
ALTER COLUMN "motor1YCurrent" SET DEFAULT 0,
ALTER COLUMN "motor1BCurrent" SET DEFAULT 0,
ALTER COLUMN "motor2RCurrent" SET DEFAULT 0,
ALTER COLUMN "motor2YCurrent" SET DEFAULT 0,
ALTER COLUMN "motor2BCurrent" SET DEFAULT 0,
ALTER COLUMN "waterAvailable" SET DEFAULT false,
ALTER COLUMN "pressureBar" SET DEFAULT 0,
ALTER COLUMN "transmitterConnected" SET DEFAULT false,
ALTER COLUMN "pressuremA" SET DEFAULT 0,
ALTER COLUMN "pumpOnDelay" SET DEFAULT 0,
ALTER COLUMN "nextFillingTime" SET DEFAULT 0,
ALTER COLUMN "overloadResetDelay" SET DEFAULT 0,
ALTER COLUMN "underloadResetDelay" SET DEFAULT 0,
ALTER COLUMN "tankStatus" SET DEFAULT false,
ALTER COLUMN "pump1FaultType" SET DEFAULT 0,
ALTER COLUMN "pump2FaultType" SET DEFAULT 0,
ALTER COLUMN "motor1RunTime" SET DEFAULT 0,
ALTER COLUMN "motor2RunTime" SET DEFAULT 0;

-- CreateTable
CREATE TABLE "RegisterDefinition" (
    "id" SERIAL NOT NULL,
    "address" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "range" TEXT,
    "description" TEXT,
    "units" TEXT,
    "mappedKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RegisterDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeviceRegisterValue" (
    "id" SERIAL NOT NULL,
    "deviceId" TEXT NOT NULL,
    "registerId" INTEGER NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeviceRegisterValue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RegisterDefinition_address_key" ON "RegisterDefinition"("address");

-- CreateIndex
CREATE UNIQUE INDEX "DeviceRegisterValue_deviceId_registerId_key" ON "DeviceRegisterValue"("deviceId", "registerId");

-- AddForeignKey
ALTER TABLE "DeviceRegisterValue" ADD CONSTRAINT "DeviceRegisterValue_registerId_fkey" FOREIGN KEY ("registerId") REFERENCES "RegisterDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeviceRegisterValue" ADD CONSTRAINT "DeviceRegisterValue_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("deviceId") ON DELETE RESTRICT ON UPDATE CASCADE;

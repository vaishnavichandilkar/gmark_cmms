-- CreateTable
CREATE TABLE "MachineSpare" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "make" TEXT,
    "modelNumber" TEXT,
    "partNumber" TEXT,
    "quantityUsed" INTEGER NOT NULL DEFAULT 1,
    "rate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "machineId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MachineSpare_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "MachineSpare" ADD CONSTRAINT "MachineSpare_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "Machine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

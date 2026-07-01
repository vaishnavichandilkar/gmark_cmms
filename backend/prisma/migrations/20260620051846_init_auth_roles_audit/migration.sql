/*
  Warnings:

  - The `role` column on the `User` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('SUPER_ADMIN', 'SOCIETY_ADMIN', 'BUILDING_ADMIN', 'OPERATOR', 'VIEWER');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "refreshToken" TEXT,
DROP COLUMN "role",
ADD COLUMN     "role" "UserRole" NOT NULL DEFAULT 'VIEWER',
ALTER COLUMN "societyId" DROP NOT NULL,
ALTER COLUMN "mobileNumber" DROP NOT NULL;

-- CreateTable
CREATE TABLE "UserBuilding" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "buildingId" INTEGER NOT NULL,

    CONSTRAINT "UserBuilding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "ipAddress" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserBuilding_userId_buildingId_key" ON "UserBuilding"("userId", "buildingId");

-- AddForeignKey
ALTER TABLE "UserBuilding" ADD CONSTRAINT "UserBuilding_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserBuilding" ADD CONSTRAINT "UserBuilding_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "Building"("id") ON DELETE CASCADE ON UPDATE CASCADE;

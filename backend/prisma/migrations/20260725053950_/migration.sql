-- AlterTable
ALTER TABLE "Device" ADD COLUMN     "company" TEXT,
ADD COLUMN     "costCenter" TEXT,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "facilityId" INTEGER,
ADD COLUMN     "headOfDepartment" TEXT,
ADD COLUMN     "isLocationPart" BOOLEAN DEFAULT false,
ADD COLUMN     "latitude" TEXT,
ADD COLUMN     "longitude" TEXT,
ADD COLUMN     "machineCategory" TEXT,
ADD COLUMN     "machineCode" TEXT,
ADD COLUMN     "machineOwner" TEXT,
ADD COLUMN     "machineSubCategory" TEXT,
ADD COLUMN     "maintenanceHead" TEXT,
ADD COLUMN     "make" TEXT,
ADD COLUMN     "modelNumber" TEXT,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "serialNumber" TEXT,
ALTER COLUMN "buildingId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "employeeId" INTEGER,
ADD COLUMN     "mainFacilityId" INTEGER;

-- CreateTable
CREATE TABLE "Employee" (
    "id" SERIAL NOT NULL,
    "employeeCode" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "mobileNumber" TEXT NOT NULL,
    "officialEmail" TEXT NOT NULL,
    "personalEmail" TEXT,
    "dateOfJoining" TIMESTAMP(3) NOT NULL,
    "dateOfBirth" TIMESTAMP(3) NOT NULL,
    "department" TEXT NOT NULL,
    "designation" TEXT NOT NULL,
    "salaryPayout" DOUBLE PRECISION,
    "role" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MainFacility" (
    "id" SERIAL NOT NULL,
    "mainFacilityCode" TEXT NOT NULL,
    "mainFacilityName" TEXT NOT NULL,
    "mainFacilityHead" TEXT NOT NULL,
    "gstNumber" TEXT,
    "category" TEXT NOT NULL,
    "subcategory" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "description" TEXT,
    "latitude" TEXT,
    "longitude" TEXT,
    "postalCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MainFacility_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Facility" (
    "id" SERIAL NOT NULL,
    "facilityCode" TEXT NOT NULL,
    "facilityName" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "isLocationPart" BOOLEAN NOT NULL DEFAULT false,
    "parentFacilityId" INTEGER,
    "address" TEXT,
    "country" TEXT,
    "state" TEXT,
    "city" TEXT,
    "postalCode" TEXT,
    "subCategory" TEXT,
    "latitude" TEXT,
    "longitude" TEXT,
    "facilityHeadName" TEXT,
    "notes" TEXT,
    "mainFacilityId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Facility_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Employee_employeeCode_key" ON "Employee"("employeeCode");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_officialEmail_key" ON "Employee"("officialEmail");

-- CreateIndex
CREATE UNIQUE INDEX "MainFacility_mainFacilityCode_key" ON "MainFacility"("mainFacilityCode");

-- CreateIndex
CREATE UNIQUE INDEX "Facility_facilityCode_key" ON "Facility"("facilityCode");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_mainFacilityId_fkey" FOREIGN KEY ("mainFacilityId") REFERENCES "MainFacility"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Device" ADD CONSTRAINT "Device_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "Facility"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Facility" ADD CONSTRAINT "Facility_parentFacilityId_fkey" FOREIGN KEY ("parentFacilityId") REFERENCES "Facility"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Facility" ADD CONSTRAINT "Facility_mainFacilityId_fkey" FOREIGN KEY ("mainFacilityId") REFERENCES "MainFacility"("id") ON DELETE CASCADE ON UPDATE CASCADE;

/*
  Warnings:

  - A unique constraint covering the columns `[gstNumber]` on the table `Registration` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Registration_gstNumber_key" ON "Registration"("gstNumber");

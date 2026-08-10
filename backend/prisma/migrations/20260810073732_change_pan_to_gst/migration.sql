/*
  Warnings:

  - You are about to drop the column `panNumber` on the `Registration` table. All the data in the column will be lost.
  - Added the required column `gstNumber` to the `Registration` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Registration" DROP COLUMN "panNumber",
ADD COLUMN     "gstNumber" TEXT NOT NULL;

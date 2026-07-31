-- AlterTable
ALTER TABLE "Permission" ADD COLUMN     "canExport" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "canImport" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "canPrint" BOOLEAN NOT NULL DEFAULT false;

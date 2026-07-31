-- CreateTable
CREATE TABLE "PostalCode" (
    "id" SERIAL NOT NULL,
    "pincode" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'India',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PostalCode_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PostalCode_pincode_key" ON "PostalCode"("pincode");

-- CreateIndex
CREATE INDEX "PostalCode_pincode_idx" ON "PostalCode"("pincode");

/*
  Warnings:

  - You are about to drop the column `developerType` on the `Developer` table. All the data in the column will be lost.
  - You are about to drop the column `developerId` on the `TechExperience` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[technicalProfileId,stackName]` on the table `TechExperience` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `technicalProfileId` to the `TechExperience` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "TechExperience" DROP CONSTRAINT "TechExperience_developerId_fkey";

-- DropIndex
DROP INDEX "TechExperience_developerId_idx";

-- DropIndex
DROP INDEX "TechExperience_developerId_stackName_key";

-- AlterTable
ALTER TABLE "Developer" DROP COLUMN "developerType";

-- AlterTable
ALTER TABLE "TechExperience" DROP COLUMN "developerId",
ADD COLUMN     "technicalProfileId" INTEGER NOT NULL;

-- CreateTable
CREATE TABLE "TechnicalProfile" (
    "id" SERIAL NOT NULL,
    "developerId" INTEGER NOT NULL,
    "developerType" "DeveloperType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TechnicalProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TechnicalProfile_developerId_key" ON "TechnicalProfile"("developerId");

-- CreateIndex
CREATE INDEX "TechnicalProfile_developerId_idx" ON "TechnicalProfile"("developerId");

-- CreateIndex
CREATE INDEX "TechExperience_technicalProfileId_idx" ON "TechExperience"("technicalProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "TechExperience_technicalProfileId_stackName_key" ON "TechExperience"("technicalProfileId", "stackName");

-- AddForeignKey
ALTER TABLE "TechnicalProfile" ADD CONSTRAINT "TechnicalProfile_developerId_fkey" FOREIGN KEY ("developerId") REFERENCES "Developer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TechExperience" ADD CONSTRAINT "TechExperience_technicalProfileId_fkey" FOREIGN KEY ("technicalProfileId") REFERENCES "TechnicalProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

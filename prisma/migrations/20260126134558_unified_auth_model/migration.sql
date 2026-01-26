/*
  Warnings:

  - You are about to drop the column `email` on the `Company` table. All the data in the column will be lost.
  - You are about to drop the column `emailVerificationToken` on the `Company` table. All the data in the column will be lost.
  - You are about to drop the column `emailVerified` on the `Company` table. All the data in the column will be lost.
  - You are about to drop the column `hashedPassword` on the `Company` table. All the data in the column will be lost.
  - You are about to drop the column `hashedRefreshToken` on the `Company` table. All the data in the column will be lost.
  - You are about to drop the column `passwordResetExpiresAt` on the `Company` table. All the data in the column will be lost.
  - You are about to drop the column `passwordResetToken` on the `Company` table. All the data in the column will be lost.
  - You are about to drop the column `email` on the `Developer` table. All the data in the column will be lost.
  - You are about to drop the column `emailVerificationToken` on the `Developer` table. All the data in the column will be lost.
  - You are about to drop the column `emailVerified` on the `Developer` table. All the data in the column will be lost.
  - You are about to drop the column `hashedPassword` on the `Developer` table. All the data in the column will be lost.
  - You are about to drop the column `hashedRefreshToken` on the `Developer` table. All the data in the column will be lost.
  - You are about to drop the column `passwordResetExpiresAt` on the `Developer` table. All the data in the column will be lost.
  - You are about to drop the column `passwordResetToken` on the `Developer` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[userId]` on the table `Company` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[userId]` on the table `Developer` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `userId` to the `Company` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `Developer` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('DEVELOPER', 'COMPANY');

-- DropIndex
DROP INDEX "Company_email_idx";

-- DropIndex
DROP INDEX "Company_email_key";

-- DropIndex
DROP INDEX "Developer_email_idx";

-- DropIndex
DROP INDEX "Developer_email_key";

-- AlterTable
ALTER TABLE "Company" DROP COLUMN "email",
DROP COLUMN "emailVerificationToken",
DROP COLUMN "emailVerified",
DROP COLUMN "hashedPassword",
DROP COLUMN "hashedRefreshToken",
DROP COLUMN "passwordResetExpiresAt",
DROP COLUMN "passwordResetToken",
ADD COLUMN     "userId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Developer" DROP COLUMN "email",
DROP COLUMN "emailVerificationToken",
DROP COLUMN "emailVerified",
DROP COLUMN "hashedPassword",
DROP COLUMN "hashedRefreshToken",
DROP COLUMN "passwordResetExpiresAt",
DROP COLUMN "passwordResetToken",
ADD COLUMN     "userId" INTEGER NOT NULL;

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "hashedPassword" TEXT NOT NULL,
    "hashedRefreshToken" TEXT,
    "role" "UserRole" NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "emailVerificationToken" TEXT,
    "passwordResetToken" TEXT,
    "passwordResetExpiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Company_userId_key" ON "Company"("userId");

-- CreateIndex
CREATE INDEX "Company_userId_idx" ON "Company"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Developer_userId_key" ON "Developer"("userId");

-- CreateIndex
CREATE INDEX "Developer_userId_idx" ON "Developer"("userId");

-- AddForeignKey
ALTER TABLE "Company" ADD CONSTRAINT "Company_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Developer" ADD CONSTRAINT "Developer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

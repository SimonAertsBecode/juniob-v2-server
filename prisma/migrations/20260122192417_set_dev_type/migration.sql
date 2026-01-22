-- CreateEnum
CREATE TYPE "DeveloperType" AS ENUM ('FRONTEND', 'BACKEND', 'FULLSTACK', 'MOBILE');

-- AlterTable
ALTER TABLE "Developer" ADD COLUMN     "developerType" "DeveloperType";

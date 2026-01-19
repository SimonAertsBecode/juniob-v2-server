/*
  Warnings:

  - You are about to drop the column `degree` on the `Developer` table. All the data in the column will be lost.
  - You are about to drop the column `githubAccessToken` on the `Developer` table. All the data in the column will be lost.
  - You are about to drop the column `githubAppInstalled` on the `Developer` table. All the data in the column will be lost.
  - You are about to drop the column `githubUsername` on the `Developer` table. All the data in the column will be lost.
  - You are about to drop the column `graduationYear` on the `Developer` table. All the data in the column will be lost.
  - You are about to drop the column `university` on the `Developer` table. All the data in the column will be lost.
  - You are about to drop the column `yearsOfExperience` on the `Developer` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "passwordResetExpiresAt" TIMESTAMP(3),
ADD COLUMN     "passwordResetToken" TEXT;

-- AlterTable
ALTER TABLE "Developer" DROP COLUMN "degree",
DROP COLUMN "githubAccessToken",
DROP COLUMN "githubAppInstalled",
DROP COLUMN "githubUsername",
DROP COLUMN "graduationYear",
DROP COLUMN "university",
DROP COLUMN "yearsOfExperience",
ADD COLUMN     "passwordResetExpiresAt" TIMESTAMP(3),
ADD COLUMN     "passwordResetToken" TEXT;

-- CreateTable
CREATE TABLE "TechExperience" (
    "id" SERIAL NOT NULL,
    "developerId" INTEGER NOT NULL,
    "stackName" TEXT NOT NULL,
    "months" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TechExperience_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GithubAppInstallation" (
    "id" TEXT NOT NULL,
    "developerId" INTEGER NOT NULL,
    "installationId" TEXT NOT NULL,
    "accessTokenEncrypted" TEXT,
    "tokenExpiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GithubAppInstallation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GithubAppRepository" (
    "id" TEXT NOT NULL,
    "installationId" TEXT NOT NULL,
    "githubRepoId" BIGINT NOT NULL,
    "repoName" TEXT NOT NULL,
    "repoFullName" TEXT NOT NULL,
    "description" TEXT,
    "isPrivate" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GithubAppRepository_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TechExperience_developerId_idx" ON "TechExperience"("developerId");

-- CreateIndex
CREATE UNIQUE INDEX "TechExperience_developerId_stackName_key" ON "TechExperience"("developerId", "stackName");

-- CreateIndex
CREATE INDEX "GithubAppInstallation_developerId_idx" ON "GithubAppInstallation"("developerId");

-- CreateIndex
CREATE UNIQUE INDEX "GithubAppInstallation_developerId_installationId_key" ON "GithubAppInstallation"("developerId", "installationId");

-- CreateIndex
CREATE INDEX "GithubAppRepository_installationId_idx" ON "GithubAppRepository"("installationId");

-- CreateIndex
CREATE INDEX "GithubAppRepository_repoFullName_idx" ON "GithubAppRepository"("repoFullName");

-- CreateIndex
CREATE UNIQUE INDEX "GithubAppRepository_installationId_githubRepoId_key" ON "GithubAppRepository"("installationId", "githubRepoId");

-- AddForeignKey
ALTER TABLE "TechExperience" ADD CONSTRAINT "TechExperience_developerId_fkey" FOREIGN KEY ("developerId") REFERENCES "Developer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GithubAppInstallation" ADD CONSTRAINT "GithubAppInstallation_developerId_fkey" FOREIGN KEY ("developerId") REFERENCES "Developer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GithubAppRepository" ADD CONSTRAINT "GithubAppRepository_installationId_fkey" FOREIGN KEY ("installationId") REFERENCES "GithubAppInstallation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

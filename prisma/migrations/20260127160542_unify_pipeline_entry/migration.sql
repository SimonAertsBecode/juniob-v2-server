-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('DEVELOPER', 'COMPANY');

-- CreateEnum
CREATE TYPE "AssessmentStatus" AS ENUM ('REGISTERING', 'PROJECTS_SUBMITTED', 'ANALYZING', 'PENDING_ANALYSIS', 'ASSESSED');

-- CreateEnum
CREATE TYPE "ProjectType" AS ENUM ('FRONTEND', 'BACKEND', 'FULLSTACK', 'MOBILE', 'OTHER');

-- CreateEnum
CREATE TYPE "ProjectAnalysisStatus" AS ENUM ('PENDING', 'ANALYZING', 'COMPLETE', 'FAILED');

-- CreateEnum
CREATE TYPE "PipelineStage" AS ENUM ('INVITED', 'REGISTERING', 'PROJECTS_SUBMITTED', 'ANALYZING', 'PENDING_ANALYSIS', 'ASSESSED', 'UNLOCKED', 'HIRED', 'REJECTED');

-- CreateEnum
CREATE TYPE "CreditTransactionType" AS ENUM ('INITIAL', 'PURCHASE', 'UNLOCK_REPORT');

-- CreateEnum
CREATE TYPE "HireRecommendation" AS ENUM ('SAFE_TO_INTERVIEW', 'INTERVIEW_WITH_CAUTION', 'NOT_READY');

-- CreateEnum
CREATE TYPE "JuniorLevel" AS ENUM ('ABOVE_EXPECTED', 'WITHIN_EXPECTED', 'BELOW_EXPECTED');

-- CreateEnum
CREATE TYPE "DeveloperType" AS ENUM ('FRONTEND', 'BACKEND', 'FULLSTACK', 'MOBILE');

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

-- CreateTable
CREATE TABLE "Company" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "industry" TEXT,
    "size" TEXT,
    "location" TEXT,
    "website" TEXT,
    "vatNumber" TEXT,
    "billingAddress" TEXT,
    "billingCountry" TEXT,
    "stripeCustomerId" TEXT,
    "emailNotifications" BOOLEAN NOT NULL DEFAULT true,
    "creditBalance" INTEGER NOT NULL DEFAULT 3,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Developer" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "location" TEXT,
    "assessmentStatus" "AssessmentStatus" NOT NULL DEFAULT 'REGISTERING',
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Developer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TechnicalProfile" (
    "id" SERIAL NOT NULL,
    "developerId" INTEGER NOT NULL,
    "developerType" "DeveloperType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TechnicalProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TechExperience" (
    "id" SERIAL NOT NULL,
    "technicalProfileId" INTEGER NOT NULL,
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

-- CreateTable
CREATE TABLE "TechnicalProject" (
    "id" SERIAL NOT NULL,
    "developerId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "githubUrl" TEXT NOT NULL,
    "projectType" "ProjectType" NOT NULL,
    "description" TEXT,
    "uiUrl" TEXT,
    "techStack" TEXT[],
    "savedAt" TIMESTAMP(3),
    "lockedUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TechnicalProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectAnalysis" (
    "id" SERIAL NOT NULL,
    "projectId" INTEGER NOT NULL,
    "status" "ProjectAnalysisStatus" NOT NULL DEFAULT 'PENDING',
    "score" INTEGER,
    "strengths" TEXT[],
    "areasForImprovement" TEXT[],
    "codeOrganization" TEXT,
    "bestPractices" TEXT[],
    "rawAnalysis" JSONB,
    "errorMessage" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HiringReport" (
    "id" SERIAL NOT NULL,
    "developerId" INTEGER NOT NULL,
    "recommendation" "HireRecommendation" NOT NULL,
    "recommendationReasons" TEXT[],
    "juniorLevel" "JuniorLevel" NOT NULL,
    "juniorLevelContext" TEXT,
    "technicalBreakdown" JSONB,
    "riskFlags" TEXT[],
    "authenticitySignal" TEXT,
    "authenticityExplanation" TEXT,
    "interviewQuestions" TEXT[],
    "overallScore" INTEGER NOT NULL,
    "scoreBand" TEXT,
    "conclusion" TEXT NOT NULL,
    "techProficiency" JSONB,
    "mentoringNeeds" TEXT[],
    "growthPotential" TEXT,
    "rawAnalysis" JSONB,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HiringReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreditTransaction" (
    "id" SERIAL NOT NULL,
    "companyId" INTEGER NOT NULL,
    "type" "CreditTransactionType" NOT NULL,
    "amount" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "description" TEXT,
    "stripePaymentIntentId" TEXT,
    "stripeSessionId" TEXT,
    "unlockedDeveloperId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CreditTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UnlockedReport" (
    "id" SERIAL NOT NULL,
    "companyId" INTEGER NOT NULL,
    "developerId" INTEGER NOT NULL,
    "unlockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UnlockedReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PipelineEntry" (
    "id" SERIAL NOT NULL,
    "companyId" INTEGER NOT NULL,
    "developerId" INTEGER,
    "candidateEmail" TEXT,
    "invitationToken" TEXT,
    "invitationMessage" TEXT,
    "invitedAt" TIMESTAMP(3),
    "tokenExpiresAt" TIMESTAMP(3),
    "stage" "PipelineStage" NOT NULL DEFAULT 'INVITED',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PipelineEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" SERIAL NOT NULL,
    "companyId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PipelineEntryTag" (
    "id" SERIAL NOT NULL,
    "pipelineEntryId" INTEGER NOT NULL,
    "tagId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PipelineEntryTag_pkey" PRIMARY KEY ("id")
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

-- CreateIndex
CREATE INDEX "Developer_assessmentStatus_idx" ON "Developer"("assessmentStatus");

-- CreateIndex
CREATE UNIQUE INDEX "TechnicalProfile_developerId_key" ON "TechnicalProfile"("developerId");

-- CreateIndex
CREATE INDEX "TechnicalProfile_developerId_idx" ON "TechnicalProfile"("developerId");

-- CreateIndex
CREATE INDEX "TechExperience_technicalProfileId_idx" ON "TechExperience"("technicalProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "TechExperience_technicalProfileId_stackName_key" ON "TechExperience"("technicalProfileId", "stackName");

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

-- CreateIndex
CREATE INDEX "TechnicalProject_developerId_idx" ON "TechnicalProject"("developerId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectAnalysis_projectId_key" ON "ProjectAnalysis"("projectId");

-- CreateIndex
CREATE INDEX "ProjectAnalysis_status_idx" ON "ProjectAnalysis"("status");

-- CreateIndex
CREATE UNIQUE INDEX "HiringReport_developerId_key" ON "HiringReport"("developerId");

-- CreateIndex
CREATE INDEX "HiringReport_recommendation_idx" ON "HiringReport"("recommendation");

-- CreateIndex
CREATE INDEX "CreditTransaction_companyId_idx" ON "CreditTransaction"("companyId");

-- CreateIndex
CREATE INDEX "CreditTransaction_type_idx" ON "CreditTransaction"("type");

-- CreateIndex
CREATE INDEX "CreditTransaction_createdAt_idx" ON "CreditTransaction"("createdAt");

-- CreateIndex
CREATE INDEX "UnlockedReport_companyId_idx" ON "UnlockedReport"("companyId");

-- CreateIndex
CREATE INDEX "UnlockedReport_developerId_idx" ON "UnlockedReport"("developerId");

-- CreateIndex
CREATE UNIQUE INDEX "UnlockedReport_companyId_developerId_key" ON "UnlockedReport"("companyId", "developerId");

-- CreateIndex
CREATE UNIQUE INDEX "PipelineEntry_invitationToken_key" ON "PipelineEntry"("invitationToken");

-- CreateIndex
CREATE INDEX "PipelineEntry_companyId_idx" ON "PipelineEntry"("companyId");

-- CreateIndex
CREATE INDEX "PipelineEntry_developerId_idx" ON "PipelineEntry"("developerId");

-- CreateIndex
CREATE INDEX "PipelineEntry_candidateEmail_idx" ON "PipelineEntry"("candidateEmail");

-- CreateIndex
CREATE INDEX "PipelineEntry_invitationToken_idx" ON "PipelineEntry"("invitationToken");

-- CreateIndex
CREATE INDEX "PipelineEntry_stage_idx" ON "PipelineEntry"("stage");

-- CreateIndex
CREATE UNIQUE INDEX "PipelineEntry_companyId_developerId_key" ON "PipelineEntry"("companyId", "developerId");

-- CreateIndex
CREATE UNIQUE INDEX "PipelineEntry_companyId_candidateEmail_key" ON "PipelineEntry"("companyId", "candidateEmail");

-- CreateIndex
CREATE INDEX "Tag_companyId_idx" ON "Tag"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_companyId_name_key" ON "Tag"("companyId", "name");

-- CreateIndex
CREATE INDEX "PipelineEntryTag_pipelineEntryId_idx" ON "PipelineEntryTag"("pipelineEntryId");

-- CreateIndex
CREATE INDEX "PipelineEntryTag_tagId_idx" ON "PipelineEntryTag"("tagId");

-- CreateIndex
CREATE UNIQUE INDEX "PipelineEntryTag_pipelineEntryId_tagId_key" ON "PipelineEntryTag"("pipelineEntryId", "tagId");

-- AddForeignKey
ALTER TABLE "Company" ADD CONSTRAINT "Company_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Developer" ADD CONSTRAINT "Developer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TechnicalProfile" ADD CONSTRAINT "TechnicalProfile_developerId_fkey" FOREIGN KEY ("developerId") REFERENCES "Developer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TechExperience" ADD CONSTRAINT "TechExperience_technicalProfileId_fkey" FOREIGN KEY ("technicalProfileId") REFERENCES "TechnicalProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GithubAppInstallation" ADD CONSTRAINT "GithubAppInstallation_developerId_fkey" FOREIGN KEY ("developerId") REFERENCES "Developer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GithubAppRepository" ADD CONSTRAINT "GithubAppRepository_installationId_fkey" FOREIGN KEY ("installationId") REFERENCES "GithubAppInstallation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TechnicalProject" ADD CONSTRAINT "TechnicalProject_developerId_fkey" FOREIGN KEY ("developerId") REFERENCES "Developer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectAnalysis" ADD CONSTRAINT "ProjectAnalysis_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "TechnicalProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HiringReport" ADD CONSTRAINT "HiringReport_developerId_fkey" FOREIGN KEY ("developerId") REFERENCES "Developer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditTransaction" ADD CONSTRAINT "CreditTransaction_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnlockedReport" ADD CONSTRAINT "UnlockedReport_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnlockedReport" ADD CONSTRAINT "UnlockedReport_developerId_fkey" FOREIGN KEY ("developerId") REFERENCES "Developer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PipelineEntry" ADD CONSTRAINT "PipelineEntry_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PipelineEntry" ADD CONSTRAINT "PipelineEntry_developerId_fkey" FOREIGN KEY ("developerId") REFERENCES "Developer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tag" ADD CONSTRAINT "Tag_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PipelineEntryTag" ADD CONSTRAINT "PipelineEntryTag_pipelineEntryId_fkey" FOREIGN KEY ("pipelineEntryId") REFERENCES "PipelineEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PipelineEntryTag" ADD CONSTRAINT "PipelineEntryTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED', 'TRACKED');

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
CREATE TYPE "HireRecommendation" AS ENUM ('STRONG_HIRE', 'HIRE', 'CONSIDER', 'NOT_READY');

-- CreateEnum
CREATE TYPE "JuniorLevel" AS ENUM ('EARLY_JUNIOR', 'MID_JUNIOR', 'SENIOR_JUNIOR');

-- CreateTable
CREATE TABLE "Company" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "hashedPassword" TEXT NOT NULL,
    "hashedRefreshToken" TEXT,
    "name" TEXT NOT NULL,
    "industry" TEXT,
    "size" TEXT,
    "location" TEXT,
    "website" TEXT,
    "vatNumber" TEXT,
    "billingAddress" TEXT,
    "billingCountry" TEXT,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "emailVerificationToken" TEXT,
    "emailNotifications" BOOLEAN NOT NULL DEFAULT true,
    "creditBalance" INTEGER NOT NULL DEFAULT 3,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Developer" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "hashedPassword" TEXT NOT NULL,
    "hashedRefreshToken" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "location" TEXT,
    "yearsOfExperience" INTEGER,
    "degree" TEXT,
    "university" TEXT,
    "graduationYear" INTEGER,
    "githubUsername" TEXT,
    "githubAccessToken" TEXT,
    "githubAppInstalled" BOOLEAN NOT NULL DEFAULT false,
    "assessmentStatus" "AssessmentStatus" NOT NULL DEFAULT 'REGISTERING',
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "emailVerificationToken" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Developer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invitation" (
    "id" SERIAL NOT NULL,
    "companyId" INTEGER NOT NULL,
    "candidateEmail" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "message" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "sentAt" TIMESTAMP(3),
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "developerId" INTEGER,

    CONSTRAINT "Invitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TechnicalProject" (
    "id" SERIAL NOT NULL,
    "developerId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "githubUrl" TEXT NOT NULL,
    "projectType" "ProjectType" NOT NULL,
    "description" TEXT,
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
    "overallScore" INTEGER NOT NULL,
    "juniorLevel" "JuniorLevel" NOT NULL,
    "aggregateStrengths" TEXT[],
    "aggregateWeaknesses" TEXT[],
    "interviewQuestions" TEXT[],
    "onboardingAreas" TEXT[],
    "mentoringNeeds" TEXT[],
    "techProficiency" JSONB,
    "redFlags" TEXT[],
    "growthPotential" TEXT,
    "recommendation" "HireRecommendation" NOT NULL,
    "conclusion" TEXT NOT NULL,
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
    "developerId" INTEGER NOT NULL,
    "stage" "PipelineStage" NOT NULL DEFAULT 'INVITED',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PipelineEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Collection" (
    "id" SERIAL NOT NULL,
    "companyId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Collection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CollectionMember" (
    "id" SERIAL NOT NULL,
    "collectionId" INTEGER NOT NULL,
    "developerId" INTEGER NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CollectionMember_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Company_email_key" ON "Company"("email");

-- CreateIndex
CREATE INDEX "Company_email_idx" ON "Company"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Developer_email_key" ON "Developer"("email");

-- CreateIndex
CREATE INDEX "Developer_email_idx" ON "Developer"("email");

-- CreateIndex
CREATE INDEX "Developer_assessmentStatus_idx" ON "Developer"("assessmentStatus");

-- CreateIndex
CREATE UNIQUE INDEX "Invitation_token_key" ON "Invitation"("token");

-- CreateIndex
CREATE UNIQUE INDEX "Invitation_developerId_key" ON "Invitation"("developerId");

-- CreateIndex
CREATE INDEX "Invitation_companyId_idx" ON "Invitation"("companyId");

-- CreateIndex
CREATE INDEX "Invitation_candidateEmail_idx" ON "Invitation"("candidateEmail");

-- CreateIndex
CREATE INDEX "Invitation_token_idx" ON "Invitation"("token");

-- CreateIndex
CREATE INDEX "Invitation_status_idx" ON "Invitation"("status");

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
CREATE INDEX "PipelineEntry_companyId_idx" ON "PipelineEntry"("companyId");

-- CreateIndex
CREATE INDEX "PipelineEntry_developerId_idx" ON "PipelineEntry"("developerId");

-- CreateIndex
CREATE INDEX "PipelineEntry_stage_idx" ON "PipelineEntry"("stage");

-- CreateIndex
CREATE UNIQUE INDEX "PipelineEntry_companyId_developerId_key" ON "PipelineEntry"("companyId", "developerId");

-- CreateIndex
CREATE INDEX "Collection_companyId_idx" ON "Collection"("companyId");

-- CreateIndex
CREATE INDEX "CollectionMember_collectionId_idx" ON "CollectionMember"("collectionId");

-- CreateIndex
CREATE INDEX "CollectionMember_developerId_idx" ON "CollectionMember"("developerId");

-- CreateIndex
CREATE UNIQUE INDEX "CollectionMember_collectionId_developerId_key" ON "CollectionMember"("collectionId", "developerId");

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_developerId_fkey" FOREIGN KEY ("developerId") REFERENCES "Developer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

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
ALTER TABLE "Collection" ADD CONSTRAINT "Collection_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionMember" ADD CONSTRAINT "CollectionMember_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "Collection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionMember" ADD CONSTRAINT "CollectionMember_developerId_fkey" FOREIGN KEY ("developerId") REFERENCES "Developer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

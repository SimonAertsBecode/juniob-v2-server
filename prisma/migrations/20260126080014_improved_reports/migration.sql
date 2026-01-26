/*
  Warnings:

  - The values [STRONG_HIRE,HIRE,CONSIDER] on the enum `HireRecommendation` will be removed. If these variants are still used in the database, this will fail.
  - The values [EARLY_JUNIOR,MID_JUNIOR,SENIOR_JUNIOR] on the enum `JuniorLevel` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `aggregateStrengths` on the `HiringReport` table. All the data in the column will be lost.
  - You are about to drop the column `aggregateWeaknesses` on the `HiringReport` table. All the data in the column will be lost.
  - You are about to drop the column `onboardingAreas` on the `HiringReport` table. All the data in the column will be lost.
  - You are about to drop the column `redFlags` on the `HiringReport` table. All the data in the column will be lost.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "HireRecommendation_new" AS ENUM ('SAFE_TO_INTERVIEW', 'INTERVIEW_WITH_CAUTION', 'NOT_READY');
ALTER TABLE "HiringReport" ALTER COLUMN "recommendation" TYPE "HireRecommendation_new" USING ("recommendation"::text::"HireRecommendation_new");
ALTER TYPE "HireRecommendation" RENAME TO "HireRecommendation_old";
ALTER TYPE "HireRecommendation_new" RENAME TO "HireRecommendation";
DROP TYPE "public"."HireRecommendation_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "JuniorLevel_new" AS ENUM ('ABOVE_EXPECTED', 'WITHIN_EXPECTED', 'BELOW_EXPECTED');
ALTER TABLE "HiringReport" ALTER COLUMN "juniorLevel" TYPE "JuniorLevel_new" USING ("juniorLevel"::text::"JuniorLevel_new");
ALTER TYPE "JuniorLevel" RENAME TO "JuniorLevel_old";
ALTER TYPE "JuniorLevel_new" RENAME TO "JuniorLevel";
DROP TYPE "public"."JuniorLevel_old";
COMMIT;

-- AlterTable
ALTER TABLE "HiringReport" DROP COLUMN "aggregateStrengths",
DROP COLUMN "aggregateWeaknesses",
DROP COLUMN "onboardingAreas",
DROP COLUMN "redFlags",
ADD COLUMN     "authenticityExplanation" TEXT,
ADD COLUMN     "authenticitySignal" TEXT,
ADD COLUMN     "juniorLevelContext" TEXT,
ADD COLUMN     "recommendationReasons" TEXT[],
ADD COLUMN     "riskFlags" TEXT[],
ADD COLUMN     "scoreBand" TEXT,
ADD COLUMN     "technicalBreakdown" JSONB;

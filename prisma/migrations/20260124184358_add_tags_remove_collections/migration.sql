/*
  Warnings:

  - You are about to drop the `Collection` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `CollectionMember` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Collection" DROP CONSTRAINT "Collection_companyId_fkey";

-- DropForeignKey
ALTER TABLE "CollectionMember" DROP CONSTRAINT "CollectionMember_collectionId_fkey";

-- DropForeignKey
ALTER TABLE "CollectionMember" DROP CONSTRAINT "CollectionMember_developerId_fkey";

-- DropTable
DROP TABLE "Collection";

-- DropTable
DROP TABLE "CollectionMember";

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
ALTER TABLE "Tag" ADD CONSTRAINT "Tag_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PipelineEntryTag" ADD CONSTRAINT "PipelineEntryTag_pipelineEntryId_fkey" FOREIGN KEY ("pipelineEntryId") REFERENCES "PipelineEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PipelineEntryTag" ADD CONSTRAINT "PipelineEntryTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

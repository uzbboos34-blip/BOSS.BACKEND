/*
  Warnings:

  - You are about to drop the column `specializationId` on the `Group` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Group" DROP CONSTRAINT "Group_specializationId_fkey";

-- AlterTable
ALTER TABLE "Group" DROP COLUMN "specializationId";

/*
  Warnings:

  - You are about to drop the column `patentId` on the `Check` table. All the data in the column will be lost.
  - You are about to drop the `Patent` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Check" DROP CONSTRAINT "Check_patentId_fkey";

-- DropForeignKey
ALTER TABLE "Patent" DROP CONSTRAINT "Patent_workerId_fkey";

-- DropIndex
DROP INDEX "Check_patentId_idx";

-- AlterTable
ALTER TABLE "Check" DROP COLUMN "patentId",
ADD COLUMN     "numberOfMonths" INTEGER NOT NULL DEFAULT 1;

-- DropTable
DROP TABLE "Patent";

/*
  Warnings:

  - You are about to drop the column `amount` on the `Check` table. All the data in the column will be lost.
  - You are about to drop the column `note` on the `Check` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Check" DROP COLUMN "amount",
DROP COLUMN "note";

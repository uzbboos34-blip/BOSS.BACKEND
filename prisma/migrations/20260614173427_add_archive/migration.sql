-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "Worker" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true;

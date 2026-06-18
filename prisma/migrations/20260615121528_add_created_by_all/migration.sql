-- AlterTable
ALTER TABLE "Attendance" ADD COLUMN     "createdBy" INTEGER;

-- AlterTable
ALTER TABLE "Check" ADD COLUMN     "createdBy" INTEGER;

-- AlterTable
ALTER TABLE "Group" ADD COLUMN     "createdBy" INTEGER;

-- AlterTable
ALTER TABLE "Patent" ADD COLUMN     "createdBy" INTEGER;

-- AlterTable
ALTER TABLE "Specialization" ADD COLUMN     "createdBy" INTEGER;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "createdBy" INTEGER;

-- AlterTable
ALTER TABLE "Worker" ADD COLUMN     "createdBy" INTEGER;

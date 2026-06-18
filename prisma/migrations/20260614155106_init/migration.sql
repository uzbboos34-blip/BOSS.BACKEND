-- CreateEnum
CREATE TYPE "Role" AS ENUM ('PLATFORM_SUPER_ADMIN', 'SUPER_ADMIN', 'ADMIN', 'SUPERVISOR');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'ABSENT', 'LATE', 'VACATION', 'SICK');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE');

-- CreateEnum
CREATE TYPE "CitizenShip" AS ENUM ('UZ', 'RU', 'KZ', 'KG', 'TJ', 'OTHER');

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "fullName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "isBlocked" BOOLEAN NOT NULL DEFAULT false,
    "superAdminId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Specialization" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "superAdminId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Specialization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Group" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "superAdminId" INTEGER NOT NULL,
    "specializationId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Group_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Worker" (
    "id" SERIAL NOT NULL,
    "centerNo" TEXT,
    "passport" TEXT NOT NULL,
    "constructionSite" TEXT,
    "sicilNo" TEXT,
    "fullName" TEXT NOT NULL,
    "fullNameRu" TEXT,
    "position" TEXT,
    "citizenship" "CitizenShip" NOT NULL DEFAULT 'UZ',
    "startDate" TIMESTAMP(3),
    "hourlyRate" DECIMAL(10,2),
    "teamDivision" TEXT,
    "department" TEXT,
    "phone" TEXT,
    "birthDate" TIMESTAMP(3),
    "workDays" INTEGER,
    "patentNo" TEXT,
    "inn" TEXT,
    "qrCode" TEXT NOT NULL,
    "campAddress" TEXT,
    "gender" "Gender",
    "searchFormula" TEXT,
    "description" TEXT,
    "naymix" TEXT,
    "yeni" TEXT,
    "superAdminId" INTEGER NOT NULL,
    "specializationId" INTEGER,
    "groupId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Worker_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Patent" (
    "id" SERIAL NOT NULL,
    "workerId" INTEGER NOT NULL,
    "patentNo" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "superAdminId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Patent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Check" (
    "id" SERIAL NOT NULL,
    "workerId" INTEGER NOT NULL,
    "patentId" INTEGER NOT NULL,
    "superAdminId" INTEGER NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "paidAt" TIMESTAMP(3) NOT NULL,
    "validFrom" TIMESTAMP(3) NOT NULL,
    "validUntil" TIMESTAMP(3) NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Check_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attendance" (
    "id" SERIAL NOT NULL,
    "workerId" INTEGER NOT NULL,
    "superAdminId" INTEGER NOT NULL,
    "status" "AttendanceStatus" NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkerHistory" (
    "id" SERIAL NOT NULL,
    "workerId" INTEGER NOT NULL,
    "superAdminId" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkerHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "Worker_passport_key" ON "Worker"("passport");

-- CreateIndex
CREATE UNIQUE INDEX "Worker_sicilNo_key" ON "Worker"("sicilNo");

-- CreateIndex
CREATE UNIQUE INDEX "Worker_phone_key" ON "Worker"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "Worker_patentNo_key" ON "Worker"("patentNo");

-- CreateIndex
CREATE UNIQUE INDEX "Worker_inn_key" ON "Worker"("inn");

-- CreateIndex
CREATE UNIQUE INDEX "Worker_qrCode_key" ON "Worker"("qrCode");

-- CreateIndex
CREATE INDEX "Worker_superAdminId_idx" ON "Worker"("superAdminId");

-- CreateIndex
CREATE INDEX "Worker_groupId_idx" ON "Worker"("groupId");

-- CreateIndex
CREATE UNIQUE INDEX "Patent_workerId_key" ON "Patent"("workerId");

-- CreateIndex
CREATE UNIQUE INDEX "Patent_patentNo_key" ON "Patent"("patentNo");

-- CreateIndex
CREATE INDEX "Check_workerId_idx" ON "Check"("workerId");

-- CreateIndex
CREATE INDEX "Check_patentId_idx" ON "Check"("patentId");

-- CreateIndex
CREATE INDEX "Attendance_workerId_idx" ON "Attendance"("workerId");

-- CreateIndex
CREATE INDEX "Attendance_date_idx" ON "Attendance"("date");

-- CreateIndex
CREATE INDEX "WorkerHistory_workerId_idx" ON "WorkerHistory"("workerId");

-- AddForeignKey
ALTER TABLE "Group" ADD CONSTRAINT "Group_specializationId_fkey" FOREIGN KEY ("specializationId") REFERENCES "Specialization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Worker" ADD CONSTRAINT "Worker_specializationId_fkey" FOREIGN KEY ("specializationId") REFERENCES "Specialization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Worker" ADD CONSTRAINT "Worker_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Patent" ADD CONSTRAINT "Patent_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "Worker"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Check" ADD CONSTRAINT "Check_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "Worker"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Check" ADD CONSTRAINT "Check_patentId_fkey" FOREIGN KEY ("patentId") REFERENCES "Patent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "Worker"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkerHistory" ADD CONSTRAINT "WorkerHistory_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "Worker"("id") ON DELETE CASCADE ON UPDATE CASCADE;

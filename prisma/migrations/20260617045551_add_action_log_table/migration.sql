-- CreateTable
CREATE TABLE "ActionLog" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "userFullName" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" INTEGER,
    "description" TEXT,
    "superAdminId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActionLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ActionLog_superAdminId_idx" ON "ActionLog"("superAdminId");

-- CreateIndex
CREATE INDEX "ActionLog_createdAt_idx" ON "ActionLog"("createdAt");

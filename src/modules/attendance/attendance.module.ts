import { Module } from "@nestjs/common";
import { AttendanceService } from "./attendance.service";
import { AttendanceController } from "./attendance.controller";
import { PrismaModule } from "src/prisma/prisma.module";
import { AuditLogModule } from "../audit-log/audit-log.module";

@Module({
  imports: [PrismaModule, AuditLogModule],
  controllers: [AttendanceController],
  providers: [AttendanceService],
})
export class AttendanceModule {}

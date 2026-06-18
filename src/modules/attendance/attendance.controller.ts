import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { AttendanceService } from "./attendance.service";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from "@nestjs/swagger";
import { AuthGuard } from "src/common/guards/token.guard";
import { RoleGuard } from "src/common/guards/role.guard";
import { Roles } from "src/common/decorators/roles";
import { Role } from "@prisma/client";
import { AssignWorkerDto, ScanAttendanceDto, UpdateAttendanceDto } from "./dto/attendance.dto";

@ApiTags("attendance")
@Controller("attendance")
@ApiBearerAuth()
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  // ─── SUPERVISOR: QR scan → davomat qo'shish ──────────────────────────────

  @UseGuards(AuthGuard, RoleGuard)
  @Roles(Role.SUPERVISOR, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: "QR kod orqali davomat qo'shish (Supervisor)" })
  @Post("scan")
  scan(@Body() payload: ScanAttendanceDto, @Req() req: any) {
    return this.attendanceService.scan(payload, req["user"]);
  }

  // ─── ADMIN / SUPER_ADMIN: hamma davomat ──────────────────────────────────

  @UseGuards(AuthGuard, RoleGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: "Barcha davomatlarni ko'rish (Admin/SuperAdmin)" })
  @ApiQuery({ name: "date", required: false, description: "Sana (YYYY-MM-DD)" })
  @ApiQuery({ name: "supervisorId", required: false, description: "Supervisor ID" })
  @ApiQuery({ name: "session", required: false, description: "Sessiya (1, 2, 3)" })
  @ApiQuery({ name: "status", required: false, description: "Holat (PRESENT, ABSENT, LATE, VACATION, SICK)" })
  @Get()
  findAll(
    @Req() req: any,
    @Query("date") date?: string,
    @Query("supervisorId") supervisorId?: string,
    @Query("session") session?: string,
    @Query("status") status?: string,
  ) {
    return this.attendanceService.findAll(req["user"], {
      date,
      supervisorId: supervisorId ? Number(supervisorId) : undefined,
      session: session ? Number(session) : undefined,
      status,
    });
  }

  // ─── SUPERVISOR: o'zi olgan davomatlar ───────────────────────────────────

  @UseGuards(AuthGuard, RoleGuard)
  @Roles(Role.SUPERVISOR, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: "O'zi olgan davomatlarni ko'rish (Supervisor)" })
  @ApiQuery({ name: "date", required: false })
  @ApiQuery({ name: "session", required: false })
  @Get("my")
  findMy(
    @Req() req: any,
    @Query("date") date?: string,
    @Query("session") session?: string,
  ) {
    return this.attendanceService.findMy(req["user"], {
      date,
      session: session ? Number(session) : undefined,
    });
  }

  // ─── ADMIN / SUPER_ADMIN: supervisor statistikasi ────────────────────────

  @UseGuards(AuthGuard, RoleGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: "Supervisorlar bo'yicha davomat statistikasi" })
  @ApiQuery({ name: "date", required: false, description: "Sana (YYYY-MM-DD) — bo'lmasa umumiy" })
  @Get("supervisor-stats")
  supervisorStats(
    @Req() req: any,
    @Query("date") date?: string,
  ) {
    return this.attendanceService.supervisorStats(req["user"], date);
  }

  // ─── ADMIN / SUPER_ADMIN: davomatni yangilash ────────────────────────────

  @UseGuards(AuthGuard, RoleGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: "Davomatni yangilash (Admin/SuperAdmin)" })
  @Put(":id")
  update(
    @Param("id", ParseIntPipe) id: number,
    @Body() payload: UpdateAttendanceDto,
    @Req() req: any,
  ) {
    return this.attendanceService.update(id, payload, req["user"]);
  }

  // ─── ADMIN / SUPER_ADMIN: davomatni o'chirish ────────────────────────────

  @UseGuards(AuthGuard, RoleGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: "Davomatni o'chirish (Admin/SuperAdmin)" })
  @Delete(":id")
  remove(
    @Param("id", ParseIntPipe) id: number,
    @Req() req: any,
  ) {
    return this.attendanceService.remove(id, req["user"]);
  }

  // ─── Supervisorga worker biriktirish ─────────────────────────────────────

  @UseGuards(AuthGuard, RoleGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: "Supervisorga workerlarni biriktirish" })
  @Post("assign")
  assignWorkers(@Body() payload: AssignWorkerDto, @Req() req: any) {
    return this.attendanceService.assignWorkers(payload, req["user"]);
  }

  // ─── Biriktirishni olib tashlash ─────────────────────────────────────────

  @UseGuards(AuthGuard, RoleGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: "Supervisor-worker biriktirishni o'chirish" })
  @Delete("assign/:id")
  removeAssignment(
    @Param("id", ParseIntPipe) id: number,
    @Req() req: any,
  ) {
    return this.attendanceService.removeAssignment(id, req["user"]);
  }

  // ─── Supervisorga biriktirilgan workerlar ────────────────────────────────

  @UseGuards(AuthGuard, RoleGuard)
  @Roles(Role.SUPERVISOR, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: "Supervisorga biriktirilgan workerlarni ko'rish" })
  @Get("supervisor/:supervisorId/workers")
  getAssignedWorkers(
    @Param("supervisorId", ParseIntPipe) supervisorId: number,
    @Req() req: any,
  ) {
    return this.attendanceService.getAssignedWorkers(supervisorId, req["user"]);
  }
}

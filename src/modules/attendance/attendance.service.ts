import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { Role } from "@prisma/client";
import { AuditLogService } from "../audit-log/audit-log.service";
import { AssignWorkerDto, ScanAttendanceDto, UpdateAttendanceDto } from "./dto/attendance.dto";

@Injectable()
export class AttendanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
  ) {}

  // ─── helpers ────────────────────────────────────────────────────────────────

  private async resolveUser(currentUser: any) {
    const user = await this.prisma.user.findUnique({
      where: { id: currentUser.id, isBlocked: false, isActive: true },
    });
    if (!user) throw new ForbiddenException("Foydalanuvchi topilmadi");
    return user;
  }

  private resolveSuperAdminId(currentUser: any, user: any): number {
    const id =
      currentUser.role === Role.SUPER_ADMIN
        ? currentUser.id
        : user.superAdminId;
    if (!id) throw new BadRequestException("Filial aniqlanmadi");
    return id;
  }

  /** Kunning boshini (00:00:00) qaytaradi — unique constraint uchun */
  private dayStart(date: Date): Date {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  // ─── QR scan → davomat qo'shish ─────────────────────────────────────────────

  async scan(payload: ScanAttendanceDto, currentUser: any) {
    const user = await this.resolveUser(currentUser);
    const superAdminId = this.resolveSuperAdminId(currentUser, user);

    // Worker ni QR orqali topish
    const rawQr = payload.qrCode || "";
    const cleanQr = rawQr.includes(":") ? rawQr.split(":")[0].trim() : rawQr.trim();

    const worker = await this.prisma.worker.findUnique({
      where: { qrCode: cleanQr },
    });
    if (!worker) throw new BadRequestException("Bu QR kodli worker topilmadi");

    // Branch tekshiruvi
    if (worker.superAdminId !== superAdminId) {
      throw new ForbiddenException("Siz bu workerni o'tkaza olmaysiz");
    }

    // Shu kun va shu sessiyada allaqachon yozuv bormi?
    const attendanceDate = payload.date
      ? this.dayStart(new Date(payload.date))
      : this.dayStart(new Date());

    const existing = await this.prisma.attendance.findUnique({
      where: {
        workerId_date_session: {
          workerId: worker.id,
          date: attendanceDate,
          session: payload.session,
        },
      },
      include: {
        supervisor: { select: { fullName: true } },
      },
    });
    if (existing) {
      const takenBy = existing.supervisorId
        ? `"${existing.supervisor?.fullName}" tomonidan`
        : "oldin";
      throw new BadRequestException(
        `"${worker.fullName}" sessiya ${payload.session} uchun bugun allaqachon ${takenBy} o'tkazilgan`,
      );
    }


    const attendance = await this.prisma.attendance.create({
      data: {
        workerId: worker.id,
        supervisorId: currentUser.id,
        superAdminId,
        status: payload.status,
        session: payload.session,
        note: payload.note,
        date: attendanceDate,
        createdBy: user.fullName,
      },
    });

    await this.auditLog.log({
      userId: currentUser.id,
      userFullName: user.fullName,
      role: currentUser.role,
      action: "CREATE",
      entityType: "Attendance",
      entityId: attendance.id,
      description: `Davomat: "${worker.fullName}" — sessiya ${payload.session}, holat: ${payload.status}`,
      superAdminId,
    });

    return {
      success: true,
      message: "Davomat muvaffaqiyatli qo'shildi",
      data: {
        attendanceId: attendance.id,
        workerName: worker.fullName,
        passport: worker.passport,
        status: attendance.status,
        session: attendance.session,
        date: attendance.date,
      },
    };
  }

  // ─── Admin/SuperAdmin: hamma davomat ────────────────────────────────────────

  async findAll(
    currentUser: any,
    filters: {
      date?: string;
      supervisorId?: number;
      session?: number;
      status?: string;
    },
  ) {
    const user = await this.resolveUser(currentUser);
    const superAdminId = this.resolveSuperAdminId(currentUser, user);

    const where: any = { superAdminId };

    if (filters.date) {
      const day = this.dayStart(new Date(filters.date));
      const nextDay = new Date(day);
      nextDay.setDate(nextDay.getDate() + 1);
      where.date = { gte: day, lt: nextDay };
    }
    if (filters.supervisorId) where.supervisorId = Number(filters.supervisorId);
    if (filters.session) where.session = Number(filters.session);
    if (filters.status) where.status = filters.status;

    return this.prisma.attendance.findMany({
      where,
      include: {
        worker: {
          select: { id: true, fullName: true, passport: true, qrCode: true },
        },
        supervisor: {
          select: { id: true, fullName: true, role: true },
        },
      },
      orderBy: [{ date: "desc" }, { session: "asc" }],
    });
  }

  // ─── Supervisor: faqat o'zi olgan davomatlar ────────────────────────────────

  async findMy(currentUser: any, filters: { date?: string; session?: number }) {
    const user = await this.resolveUser(currentUser);
    const superAdminId = this.resolveSuperAdminId(currentUser, user);

    const where: any = { supervisorId: currentUser.id, superAdminId };

    if (filters.date) {
      const day = this.dayStart(new Date(filters.date));
      const nextDay = new Date(day);
      nextDay.setDate(nextDay.getDate() + 1);
      where.date = { gte: day, lt: nextDay };
    }
    if (filters.session) where.session = Number(filters.session);

    return this.prisma.attendance.findMany({
      where,
      include: {
        worker: {
          select: { id: true, fullName: true, passport: true, qrCode: true },
        },
      },
      orderBy: [{ date: "desc" }, { session: "asc" }],
    });
  }

  // ─── Admin/SuperAdmin: supervisor statistikasi ───────────────────────────────

  async supervisorStats(currentUser: any, date?: string) {
    const user = await this.resolveUser(currentUser);
    const superAdminId = this.resolveSuperAdminId(currentUser, user);

    // Barcha supervisorlarni olish
    const supervisors = await this.prisma.user.findMany({
      where: { superAdminId, role: Role.SUPERVISOR, isActive: true },
      select: { id: true, fullName: true },
    });

    const dateFilter: any = {};
    if (date) {
      const day = this.dayStart(new Date(date));
      const nextDay = new Date(day);
      nextDay.setDate(nextDay.getDate() + 1);
      dateFilter.date = { gte: day, lt: nextDay };
    }

    const stats = await Promise.all(
      supervisors.map(async (sup) => {
        const attendances = await this.prisma.attendance.findMany({
          where: { supervisorId: sup.id, superAdminId, ...dateFilter },
          select: { status: true },
        });

        const total = attendances.length;
        const present = attendances.filter((a) => a.status === "PRESENT").length;
        const absent = attendances.filter((a) => a.status === "ABSENT").length;
        const late = attendances.filter((a) => a.status === "LATE").length;
        const vacation = attendances.filter((a) => a.status === "VACATION").length;
        const sick = attendances.filter((a) => a.status === "SICK").length;

        return {
          supervisorId: sup.id,
          supervisorName: sup.fullName,
          totalCount: total,
          presentCount: present,
          absentCount: absent,
          lateCount: late,
          vacationCount: vacation,
          sickCount: sick,
        };
      }),
    );

    return stats;
  }

  // ─── Admin/SuperAdmin: davomatni yangilash ───────────────────────────────────

  async update(id: number, payload: UpdateAttendanceDto, currentUser: any) {
    const user = await this.resolveUser(currentUser);
    const superAdminId = this.resolveSuperAdminId(currentUser, user);

    const attendance = await this.prisma.attendance.findUnique({
      where: { id },
      include: { worker: { select: { fullName: true } } },
    });
    if (!attendance) throw new NotFoundException("Davomat topilmadi");
    if (attendance.superAdminId !== superAdminId)
      throw new ForbiddenException("Sizda bu davomatni o'zgartirish huquqi yo'q");

    const updated = await this.prisma.attendance.update({
      where: { id },
      data: {
        ...(payload.status && { status: payload.status }),
        ...(payload.session && { session: payload.session }),
      },
    });

    await this.auditLog.log({
      userId: currentUser.id,
      userFullName: user.fullName,
      role: currentUser.role,
      action: "UPDATE",
      entityType: "Attendance",
      entityId: id,
      description: `Davomat yangilandi: "${attendance.worker.fullName}" — holat: ${updated.status}`,
      superAdminId,
    });

    return { success: true, message: "Davomat yangilandi" };
  }

  // ─── Admin/SuperAdmin: davomatni o'chirish ───────────────────────────────────

  async remove(id: number, currentUser: any) {
    const user = await this.resolveUser(currentUser);
    const superAdminId = this.resolveSuperAdminId(currentUser, user);

    const attendance = await this.prisma.attendance.findUnique({
      where: { id },
      include: { worker: { select: { fullName: true } } },
    });
    if (!attendance) throw new NotFoundException("Davomat topilmadi");
    if (attendance.superAdminId !== superAdminId)
      throw new ForbiddenException("Sizda bu davomatni o'chirish huquqi yo'q");

    await this.prisma.attendance.delete({ where: { id } });

    await this.auditLog.log({
      userId: currentUser.id,
      userFullName: user.fullName,
      role: currentUser.role,
      action: "DELETE",
      entityType: "Attendance",
      entityId: id,
      description: `Davomat o'chirildi: "${attendance.worker.fullName}"`,
      superAdminId,
    });

    return { success: true, message: "Davomat o'chirildi" };
  }

  // ─── Supervisorga worker biriktirish ────────────────────────────────────────

  async assignWorkers(payload: AssignWorkerDto, currentUser: any) {
    const user = await this.resolveUser(currentUser);
    const superAdminId = this.resolveSuperAdminId(currentUser, user);

    // Supervisor mavjudligini tekshirish
    const supervisor = await this.prisma.user.findUnique({
      where: { id: payload.supervisorId, superAdminId, role: Role.SUPERVISOR },
    });
    if (!supervisor)
      throw new BadRequestException("Supervisor topilmadi yoki bu branchga tegishli emas");

    // Workerlarni tekshirish (faqat shu branchga tegishli bo'lganlarini)
    const workers = await this.prisma.worker.findMany({
      where: { id: { in: payload.workerIds }, superAdminId },
      select: { id: true },
    });
    const validWorkerIds = workers.map(w => w.id);

    if (validWorkerIds.length === 0) {
      return {
        success: true,
        message: "Biriktiriladigan ishchilar topilmadi",
      };
    }

    // Allaqachon biriktirilgan workerlarni topish (istalgan supervisorga)
    const existingAssignments = await this.prisma.supervisorWorker.findMany({
      where: { workerId: { in: validWorkerIds } },
      select: { workerId: true },
    });
    const assignedWorkerIds = new Set(existingAssignments.map(a => a.workerId));

    // Faqat hali biriktirilmaganlarini filtrlash
    const toAssignIds = validWorkerIds.filter(id => !assignedWorkerIds.has(id));

    if (toAssignIds.length > 0) {
      await this.prisma.supervisorWorker.createMany({
        data: toAssignIds.map(workerId => ({
          supervisorId: payload.supervisorId,
          workerId,
          superAdminId
        })),
        skipDuplicates: true,
      });
    }

    return {
      success: true,
      message: `${toAssignIds.length} ta worker supervisorga muvaffaqiyatli biriktirildi`,
    };
  }

  async getAllAssignments(currentUser: any) {
    const user = await this.resolveUser(currentUser);
    const superAdminId = this.resolveSuperAdminId(currentUser, user);
    return this.prisma.supervisorWorker.findMany({
      where: { superAdminId },
    });
  }

  // ─── Biriktirishni olib tashlash ─────────────────────────────────────────────

  async removeAssignment(id: number, currentUser: any) {
    const user = await this.resolveUser(currentUser);
    const superAdminId = this.resolveSuperAdminId(currentUser, user);

    const assignment = await this.prisma.supervisorWorker.findUnique({
      where: { id },
    });
    if (!assignment) throw new NotFoundException("Biriktiruv topilmadi");
    if (assignment.superAdminId !== superAdminId)
      throw new ForbiddenException("Sizda bu biriktirishni o'chirish huquqi yo'q");

    await this.prisma.supervisorWorker.delete({ where: { id } });

    return { success: true, message: "Biriktiruv olib tashlandi" };
  }

  // ─── Supervisorga biriktirilgan workerlar ───────────────────────────────────

  async getAssignedWorkers(supervisorId: number, currentUser: any) {
    const user = await this.resolveUser(currentUser);
    const superAdminId = this.resolveSuperAdminId(currentUser, user);

    // SUPERVISOR faqat o'zining biriktirilgan workerlarini ko'ra oladi
    if (currentUser.role === Role.SUPERVISOR && currentUser.id !== supervisorId) {
      throw new ForbiddenException("Siz faqat o'zingizga biriktirilgan workerlarni ko'ra olasiz");
    }

    const assignments = await this.prisma.supervisorWorker.findMany({
      where: { supervisorId, superAdminId },
    });

    const workerIds = assignments.map((a) => a.workerId);

    const workers = await this.prisma.worker.findMany({
      where: { id: { in: workerIds } },
      select: {
        id: true,
        fullName: true,
        passport: true,
        qrCode: true,
        position: true,
        group: { select: { id: true, name: true } },
      },
    });

    const assignedWorkers = workers.map((w) => {
      const ass = assignments.find((a) => a.workerId === w.id);
      return {
        ...w,
        assignmentId: ass ? ass.id : null,
      };
    });

    return { supervisorId, assignedWorkers };
  }
}

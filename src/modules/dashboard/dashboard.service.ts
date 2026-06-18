import { Injectable } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { Role, AttendanceStatus } from "@prisma/client";

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats(user: any) {
    // For SUPER_ADMIN or PLATFORM_SUPER_ADMIN, show all. For others, we can optionally scope or show all as fallback.
    const isSuper = user.role === Role.SUPER_ADMIN || user.role === Role.PLATFORM_SUPER_ADMIN;
    
    // Scoped where clauses
    const scopeWhere = isSuper ? {} : { superAdminId: user.superAdminId || undefined };
    const userScopeWhere = isSuper ? {} : { superAdminId: user.superAdminId || undefined };

    const [workersCount, activeWorkersCount, supervisorsCount, groupsCount, specializationsCount, checksCount] = await Promise.all([
      this.prisma.worker.count({ where: scopeWhere }),
      this.prisma.worker.count({ where: { ...scopeWhere, isActive: true } }),
      this.prisma.user.count({ where: { ...userScopeWhere, role: Role.SUPERVISOR } }),
      this.prisma.group.count({ where: scopeWhere }),
      this.prisma.specialization.count({ where: scopeWhere }),
      this.prisma.check.count({ where: scopeWhere }),
    ]);

    // Calculate active workers rate
    const activeWorkersRate = workersCount > 0 ? Math.round((activeWorkersCount / workersCount) * 100) : 0;

    // Calculate attendance rate
    const [totalAttendance, presentAttendance] = await Promise.all([
      this.prisma.attendance.count({ where: scopeWhere }),
      this.prisma.attendance.count({ where: { ...scopeWhere, status: AttendanceStatus.PRESENT } }),
    ]);
    const attendanceRate = totalAttendance > 0 ? Math.round((presentAttendance / totalAttendance) * 100) : 0;

    // Fetch recent action logs
    const actionLogs = await this.prisma.actionLog.findMany({
      where: isSuper ? {} : { superAdminId: user.superAdminId || undefined },
      take: 5,
      orderBy: { createdAt: 'desc' },
    });

    const recentActivity = actionLogs.map(log => {
      let dotColor = '#7b61ff'; // default (e.g. UPDATE)
      if (log.action === 'CREATE') dotColor = '#10b981';
      if (log.action === 'DELETE') dotColor = '#ef4444';

      return {
        dot: dotColor,
        text: `${log.userFullName} (${log.role}): ${log.action} ${log.entityType} ${log.description || ''}`,
        date: log.createdAt,
      };
    });

    return {
      success: true,
      data: {
        students: workersCount,
        teachers: supervisorsCount,
        groups: groupsCount,
        courses: specializationsCount,
        rooms: checksCount,
        activeStudentsRate: activeWorkersRate,
        attendanceRate: attendanceRate,
        homeworkCompletionRate: 0,
        courseOccupancyRate: 0,
        recentActivity: recentActivity,
      }
    };
  }
}

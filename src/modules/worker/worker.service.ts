import { Injectable, ForbiddenException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { CreateWorkerDto, UpdateWorkerDto } from "./dto/create-worker.dto";
import { Role } from "@prisma/client";
import { AuditLogService } from "../audit-log/audit-log.service";

@Injectable()
export class WorkerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
  ) {}

  private calculateDaysUntilBirthday(birthDateInput?: string): number | null {
    if (!birthDateInput) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const birthDate = new Date(birthDateInput);
    const nextBirthday = new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate());
    nextBirthday.setHours(0, 0, 0, 0);

    if (nextBirthday < today) {
      nextBirthday.setFullYear(today.getFullYear() + 1);
    }

    const diffTime = nextBirthday.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  async create(payload: CreateWorkerDto, currentUser: any) {
    const user = await this.prisma.user.findUnique({
      where: {
        id: currentUser.id,
        isBlocked: false,
        isActive: true,
      },
    });

    if (!user) {
      throw new ForbiddenException("Пользователь не найден");
    }

    const superAdminId = currentUser.role === Role.SUPER_ADMIN
      ? currentUser.id
      : user.superAdminId;

    if (!superAdminId) {
      throw new BadRequestException("Не удалось определить филиал");
    }

    const existPassport = await this.prisma.worker.findUnique({
      where: { passport: payload.passport }
    });
    if (existPassport) {
      throw new BadRequestException("Работник с таким паспортом уже существует");
    }

    if (payload.phone) {
      const existPhone = await this.prisma.worker.findUnique({
        where: { phone: payload.phone }
      });
      if (existPhone) {
        throw new BadRequestException("Работник с таким номером телефона уже существует");
      }
    }

    const existQrCode = await this.prisma.worker.findUnique({
      where: { qrCode: payload.qrCode }
    });
    if (existQrCode) {
      throw new BadRequestException("Работник с таким QR-кодом уже существует");
    }

    // Group branch validation
    if (payload.groupId) {
      const group = await this.prisma.group.findFirst({
        where: { id: payload.groupId, superAdminId }
      });
      if (!group) {
        throw new BadRequestException("Группа не найдена в вашем филиале");
      }
    }

    // Specialization branch validation
    if (payload.specializationId) {
      const spec = await this.prisma.specialization.findFirst({
        where: { id: payload.specializationId, superAdminId }
      });
      if (!spec) {
        throw new BadRequestException("Специализация не найдена в вашем филиале");
      }
    }

    // Calculations
    const workDays = this.calculateDaysUntilBirthday(payload.birthDate) ?? undefined;

    let patentEndDate: Date | undefined;
    if (payload.patentStartDate) {
      const startDate = new Date(payload.patentStartDate);
      patentEndDate = new Date(startDate);
      patentEndDate.setFullYear(startDate.getFullYear() + 1);
    }

    let worker;
    try {
      worker = await this.prisma.worker.create({
        data: {
          centerNo: payload.centerNo,
          passport: payload.passport,
          constructionSite: payload.constructionSite,
          sicilNo: payload.sicilNo,
          fullName: payload.fullName,
          fullNameRu: payload.fullNameRu,
          position: payload.position,
          citizenship: payload.citizenship,
          startDate: payload.startDate ? new Date(payload.startDate) : undefined,
          hourlyRate: payload.hourlyRate,
          teamDivision: payload.teamDivision,
          department: payload.department,
          phone: payload.phone,
          birthDate: payload.birthDate ? new Date(payload.birthDate) : undefined,
          workDays: workDays,
          patentNo: payload.patentNo,
          patentStartDate: payload.patentStartDate ? new Date(payload.patentStartDate) : undefined,
          patentEndDate: patentEndDate,
          inn: payload.inn,
          qrCode: payload.qrCode,
          campAddress: payload.campAddress,
          gender: payload.gender,
          superAdminId: superAdminId,
          specializationId: payload.specializationId,
          groupId: payload.groupId,
          createdBy: user.fullName,
        }
      });
    } catch (error: any) {
      if (error.code === 'P2002') {
        const target = error.meta?.target;
        let fieldName = 'уникальное поле';
        if (Array.isArray(target)) {
          if (target.some((t: string) => t.includes('passport'))) fieldName = 'паспорт (passport)';
          else if (target.some((t: string) => t.includes('sicilNo'))) fieldName = 'Sicil No';
          else if (target.some((t: string) => t.includes('phone'))) fieldName = 'номер телефона (phone)';
          else if (target.some((t: string) => t.includes('patentNo'))) fieldName = 'номер патента (patentNo)';
          else if (target.some((t: string) => t.includes('inn'))) fieldName = 'ИНН (inn)';
          else if (target.some((t: string) => t.includes('qrCode'))) fieldName = 'QR-код (qrCode)';
        } else if (typeof target === 'string') {
          if (target.includes('passport')) fieldName = 'паспорт (passport)';
          else if (target.includes('sicilNo')) fieldName = 'Sicil No';
          else if (target.includes('phone')) fieldName = 'номер телефона (phone)';
          else if (target.includes('patentNo')) fieldName = 'номер патента (patentNo)';
          else if (target.includes('inn')) fieldName = 'ИНН (inn)';
          else if (target.includes('qrCode')) fieldName = 'QR-код (qrCode)';
        }
        throw new BadRequestException(`Работник с таким значением "${fieldName}" уже существует`);
      }
      throw error;
    }

    await this.auditLog.log({
      userId: currentUser.id,
      userFullName: user.fullName,
      role: currentUser.role,
      action: 'CREATE',
      entityType: 'Worker',
      entityId: worker.id,
      description: `Создан рабочий "${worker.fullName}"`,
      superAdminId,
    });

    return {
      success: true,
      message: "Работник успешно создан"
    };
  }

  async findAll(currentUser: any, query?: { name?: string; passport?: string; qr?: string; job?: string; brigade?: string; color?: string }) {
    const user = await this.prisma.user.findUnique({
      where: {
        id: currentUser.id,
        isBlocked: false,
        isActive: true,
      },
    });

    if (!user) {
      throw new ForbiddenException("Пользователь не найден");
    }

    const superAdminId = currentUser.role === Role.SUPER_ADMIN
      ? currentUser.id
      : user.superAdminId;

    if (!superAdminId) {
      throw new BadRequestException("Не удалось определить филиал");
    }

    const where: any = { superAdminId };

    if (query?.name) {
      where.fullName = { contains: query.name, mode: 'insensitive' };
    }

    if (query?.passport) {
      where.passport = { contains: query.passport, mode: 'insensitive' };
    }

    if (query?.qr) {
      where.qrCode = { contains: query.qr, mode: 'insensitive' };
    }

    if (query?.job) {
      where.OR = [
        { position: { contains: query.job, mode: 'insensitive' } },
        { specialization: { name: { contains: query.job, mode: 'insensitive' } } }
      ];
    }

    if (query?.brigade) {
      where.group = { name: { contains: query.brigade, mode: 'insensitive' } };
    }

    if (query?.color) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (query.color === 'red') {
        const threeDaysOut = new Date(today);
        threeDaysOut.setDate(today.getDate() + 3);
        where.patentEndDate = {
          gt: today,
          lte: threeDaysOut,
        };
      } else if (query.color === 'yellow') {
        const threeDaysOut = new Date(today);
        threeDaysOut.setDate(today.getDate() + 3);
        const tenDaysOut = new Date(today);
        tenDaysOut.setDate(today.getDate() + 10);
        where.patentEndDate = {
          gt: threeDaysOut,
          lte: tenDaysOut,
        };
      } else if (query.color === 'black') {
        where.OR = [
          { patentEndDate: { lte: today } },
          { patentEndDate: null }
        ];
      }
    }

    const workers = await this.prisma.worker.findMany({
      where,
      include: {
        group: { select: { id: true, name: true } },
        specialization: { select: { id: true, name: true } },
        checks: {
          orderBy: { validUntil: 'desc' }
        }
      },
      orderBy: { createdAt: "desc" },
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return workers.map(worker => {
      const totalCheckMonths = worker.checks.reduce((sum, c) => sum + c.numberOfMonths, 0);
      
      let remainingCheckDays: number | null = null;
      let lastCheckExpiration: Date | null = null;
      
      if (worker.checks.length > 0) {
        lastCheckExpiration = worker.checks[0].validUntil;
        const expirationDate = new Date(lastCheckExpiration);
        expirationDate.setHours(0, 0, 0, 0);
        const diffTime = expirationDate.getTime() - today.getTime();
        remainingCheckDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      }

      let remainingPatentDays: number | null = null;
      if (worker.patentEndDate) {
        const patentExpDate = new Date(worker.patentEndDate);
        patentExpDate.setHours(0, 0, 0, 0);
        const diffTime = patentExpDate.getTime() - today.getTime();
        remainingPatentDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      }

      const { checks, ...workerData } = worker;
      return {
        ...workerData,
        totalCheckMonths,
        remainingCheckDays,
        lastCheckExpiration,
        remainingPatentDays,
      };
    });
  }

  async findByGroup(groupId: number, currentUser: any) {
    const user = await this.prisma.user.findUnique({
      where: { id: currentUser.id, isBlocked: false, isActive: true },
    });
    if (!user) throw new ForbiddenException('Пользователь не найден');

    const superAdminId = currentUser.role === Role.SUPER_ADMIN
      ? currentUser.id
      : user.superAdminId;
    if (!superAdminId) throw new BadRequestException('Не удалось определить филиал');

    // Guruh shu superAdminga tegishliligini tekshirish
    const group = await this.prisma.group.findFirst({
      where: { id: groupId, superAdminId },
    });
    if (!group) throw new ForbiddenException('Группа не найдена или нет доступа');

    const workers = await this.prisma.worker.findMany({
      where: { groupId, superAdminId },
      include: {
        group: { select: { id: true, name: true } },
        specialization: { select: { id: true, name: true } },
        checks: { orderBy: { validUntil: 'desc' } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return workers.map(worker => {
      const totalCheckMonths = worker.checks.reduce((sum, c) => sum + c.numberOfMonths, 0);
      let remainingCheckDays: number | null = null;
      let lastCheckExpiration: Date | null = null;
      if (worker.checks.length > 0) {
        lastCheckExpiration = worker.checks[0].validUntil;
        const exp = new Date(lastCheckExpiration);
        exp.setHours(0, 0, 0, 0);
        remainingCheckDays = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      }
      const { checks, ...workerData } = worker;
      return { ...workerData, totalCheckMonths, remainingCheckDays, lastCheckExpiration };
    });
  }

  async findOne(id: number, currentUser: any) {
    const user = await this.prisma.user.findUnique({
      where: {
        id: currentUser.id,
        isBlocked: false,
        isActive: true,
      },
    });

    if (!user) {
      throw new ForbiddenException("Пользователь не найден");
    }

    const superAdminId = currentUser.role === Role.SUPER_ADMIN
      ? currentUser.id
      : user.superAdminId;

    if (!superAdminId) {
      throw new BadRequestException("Не удалось определить филиал");
    }

    const worker = await this.prisma.worker.findUnique({
      where: { id },
      include: {
        group: true,
        specialization: true,
        checks: {
          orderBy: { validUntil: 'desc' }
        }
      }
    });

    if (!worker) {
      throw new BadRequestException("Работник не найден");
    }

    if (worker.superAdminId !== superAdminId) {
      throw new ForbiddenException("У вас нет доступа к этому сотруднику");
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const totalCheckMonths = worker.checks.reduce((sum, c) => sum + c.numberOfMonths, 0);
    
    let remainingCheckDays: number | null = null;
    let lastCheckExpiration: Date | null = null;
    
    if (worker.checks.length > 0) {
      lastCheckExpiration = worker.checks[0].validUntil;
      const expirationDate = new Date(lastCheckExpiration);
      expirationDate.setHours(0, 0, 0, 0);
      const diffTime = expirationDate.getTime() - today.getTime();
      remainingCheckDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    const { checks, ...workerData } = worker;
    return {
      ...workerData,
      totalCheckMonths,
      remainingCheckDays,
      lastCheckExpiration,
      checks,
    };
  }

  async update(id: number, payload: UpdateWorkerDto, currentUser: any) {
    const user = await this.prisma.user.findUnique({
      where: {
        id: currentUser.id,
        isBlocked: false,
        isActive: true,
      },
    });

    if (!user) {
      throw new ForbiddenException("Пользователь не найден");
    }

    const superAdminId = currentUser.role === Role.SUPER_ADMIN
      ? currentUser.id
      : user.superAdminId;

    if (!superAdminId) {
      throw new BadRequestException("Не удалось определить филиал");
    }

    const worker = await this.prisma.worker.findUnique({
      where: { id },
    });

    if (!worker) {
      throw new BadRequestException("Работник не найден");
    }

    if (worker.superAdminId !== superAdminId) {
      throw new ForbiddenException("У вас нет прав для изменения этого сотрудника");
    }

    if (payload.passport && payload.passport !== worker.passport) {
      const existPassport = await this.prisma.worker.findUnique({
        where: { passport: payload.passport }
      });
      if (existPassport) {
        throw new BadRequestException("Работник с таким паспортом уже существует");
      }
    }

    if (payload.phone && payload.phone !== worker.phone) {
      const existPhone = await this.prisma.worker.findUnique({
        where: { phone: payload.phone }
      });
      if (existPhone) {
        throw new BadRequestException("Работник с таким номером телефона уже существует");
      }
    }

    if (payload.qrCode && payload.qrCode !== worker.qrCode) {
      const existQrCode = await this.prisma.worker.findUnique({
        where: { qrCode: payload.qrCode }
      });
      if (existQrCode) {
        throw new BadRequestException("Работник с таким QR-кодом уже существует");
      }
    }

    if (payload.groupId) {
      const group = await this.prisma.group.findFirst({
        where: { id: payload.groupId, superAdminId }
      });
      if (!group) {
        throw new BadRequestException("Группа не найдена в вашем филиале");
      }
    }

    if (payload.specializationId) {
      const spec = await this.prisma.specialization.findFirst({
        where: { id: payload.specializationId, superAdminId }
      });
      if (!spec) {
        throw new BadRequestException("Специализация не найдена в вашем филиале");
      }
    }

    // Recalculations if birthDate or patentStartDate is changed
    let workDays = worker.workDays;
    if (payload.birthDate !== undefined) {
      workDays = this.calculateDaysUntilBirthday(payload.birthDate ?? undefined);
    }

    let patentEndDate = worker.patentEndDate;
    if (payload.patentStartDate !== undefined) {
      if (payload.patentStartDate) {
        const startDate = new Date(payload.patentStartDate);
        patentEndDate = new Date(startDate);
        patentEndDate.setFullYear(startDate.getFullYear() + 1);
      } else {
        patentEndDate = null;
      }
    }

    const updatedWorker = await this.prisma.worker.update({
      where: { id },
      data: {
        centerNo: payload.centerNo,
        passport: payload.passport,
        constructionSite: payload.constructionSite,
        sicilNo: payload.sicilNo,
        fullName: payload.fullName,
        fullNameRu: payload.fullNameRu,
        position: payload.position,
        citizenship: payload.citizenship,
        startDate: payload.startDate ? new Date(payload.startDate) : payload.startDate === null ? null : undefined,
        hourlyRate: payload.hourlyRate,
        teamDivision: payload.teamDivision,
        department: payload.department,
        phone: payload.phone,
        birthDate: payload.birthDate ? new Date(payload.birthDate) : payload.birthDate === null ? null : undefined,
        workDays: workDays,
        patentNo: payload.patentNo,
        patentStartDate: payload.patentStartDate ? new Date(payload.patentStartDate) : payload.patentStartDate === null ? null : undefined,
        patentEndDate: patentEndDate,
        inn: payload.inn,
        qrCode: payload.qrCode,
        campAddress: payload.campAddress,
        gender: payload.gender,
        specializationId: payload.specializationId,
        groupId: payload.groupId,
      }
    });

    await this.auditLog.log({
      userId: currentUser.id,
      userFullName: user.fullName,
      role: currentUser.role,
      action: 'UPDATE',
      entityType: 'Worker',
      entityId: worker.id,
      description: `Обновлены данные рабочего "${worker.fullName}"`,
      superAdminId,
    });

    return {
      success: true,
      message: "Данные сотрудника успешно обновлены",
      data: updatedWorker
    };
  }

  async remove(id: number, currentUser: any) {
    const user = await this.prisma.user.findUnique({
      where: {
        id: currentUser.id,
        isBlocked: false,
        isActive: true,
      },
    });

    if (!user) {
      throw new ForbiddenException("Пользователь не найден");
    }

    const superAdminId = currentUser.role === Role.SUPER_ADMIN
      ? currentUser.id
      : user.superAdminId;

    if (!superAdminId) {
      throw new BadRequestException("Не удалось определить филиал");
    }

    const worker = await this.prisma.worker.findUnique({
      where: { id },
    });

    if (!worker) {
      throw new BadRequestException("Работник не найден");
    }

    if (worker.superAdminId !== superAdminId) {
      throw new ForbiddenException("У вас нет прав для удаления этого сотрудника");
    }

    await this.prisma.worker.delete({
      where: { id },
    });

    await this.auditLog.log({
      userId: currentUser.id,
      userFullName: user.fullName,
      role: currentUser.role,
      action: 'DELETE',
      entityType: 'Worker',
      entityId: worker.id,
      description: `Удален рабочий "${worker.fullName}"`,
      superAdminId,
    });

    return {
      success: true,
      message: "Работник успешно удален"
    };
  }
}

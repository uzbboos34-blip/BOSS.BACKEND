import { Injectable, BadRequestException, ForbiddenException } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { CreateCheckDto, CreateBulkCheckDto } from "./dto/create-check.dto";
import { Role } from "@prisma/client";
import { AuditLogService } from "../audit-log/audit-log.service";

@Injectable()
export class CheckService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
  ) {}

  async create(payload: CreateCheckDto, currentUser: any) {
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

    // Find worker by passport
    const worker = await this.prisma.worker.findUnique({
      where: { passport: payload.passport }
    });

    if (!worker) {
      throw new BadRequestException("Работник с таким паспортом не найден");
    }

    // Check branch permissions
    if (worker.superAdminId !== superAdminId) {
      throw new ForbiddenException("У вас нет прав для добавления чека этому сотруднику");
    }

    if (!worker.patentStartDate) {
      throw new BadRequestException("У этого работника не указана дата выдачи патента. Сначала укажите её.");
    }

    // Find existing checks to determine the next coverage period
    const existingChecks = await this.prisma.check.findMany({
      where: { workerId: worker.id },
      orderBy: { validUntil: 'desc' }
    });

    let validFrom = new Date(worker.patentStartDate);
    if (existingChecks.length > 0) {
      validFrom = new Date(existingChecks[0].validUntil);
    }

    const validUntil = new Date(validFrom);
    validUntil.setMonth(validUntil.getMonth() + payload.numberOfMonths);

    const check = await this.prisma.check.create({
      data: {
        workerId: worker.id,
        superAdminId: worker.superAdminId,
        paidAt: new Date(payload.paidAt),
        validFrom,
        validUntil,
        numberOfMonths: payload.numberOfMonths,
        createdBy: user.fullName
      }
    });

    // Calculate remaining days from today until validUntil
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const expirationDate = new Date(validUntil);
    expirationDate.setHours(0, 0, 0, 0);

    const diffTime = expirationDate.getTime() - today.getTime();
    const remainingDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    await this.auditLog.log({
      userId: currentUser.id,
      userFullName: user.fullName,
      role: currentUser.role,
      action: 'CREATE',
      entityType: 'Check',
      entityId: check.id,
      description: `Добавлен чек оплаты на ${check.numberOfMonths} мес. для рабочего "${worker.fullName}"`,
      superAdminId,
    });

    return {
      success: true,
      message: "Чек успешно добавлен",
    };
  }

  async createBulk(payload: CreateBulkCheckDto, currentUser: any) {
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

    const results: any[] = [];
    const errors: any[] = [];

    for (const passport of payload.passports) {
      try {
        const worker = await this.prisma.worker.findUnique({
          where: { passport }
        });

        if (!worker) {
          throw new BadRequestException(`Работник с паспортом ${passport} не найден`);
        }

        if (worker.superAdminId !== superAdminId) {
          throw new ForbiddenException(`У вас нет прав для добавления чека сотруднику ${worker.fullName}`);
        }

        if (!worker.patentStartDate) {
          throw new BadRequestException(`У работника ${worker.fullName} не указана дата выдачи патента`);
        }

        const existingChecks = await this.prisma.check.findMany({
          where: { workerId: worker.id },
          orderBy: { validUntil: 'desc' }
        });

        let validFrom = new Date(worker.patentStartDate);
        if (existingChecks.length > 0) {
          validFrom = new Date(existingChecks[0].validUntil);
        }

        const validUntil = new Date(validFrom);
        validUntil.setMonth(validUntil.getMonth() + payload.numberOfMonths);

        const check = await this.prisma.check.create({
          data: {
            workerId: worker.id,
            superAdminId: worker.superAdminId,
            paidAt: new Date(payload.paidAt),
            validFrom,
            validUntil,
            numberOfMonths: payload.numberOfMonths,
            createdBy: user.fullName
          }
        });

        await this.auditLog.log({
          userId: currentUser.id,
          userFullName: user.fullName,
          role: currentUser.role,
          action: 'CREATE',
          entityType: 'Check',
          entityId: check.id,
          description: `Добавлен чек оплаты на ${check.numberOfMonths} мес. для рабочего "${worker.fullName}" (в пакете)`,
          superAdminId,
        });

        results.push({ passport, success: true, workerName: worker.fullName });
      } catch (err) {
        errors.push({ passport, message: err.message || 'Ошибка добавления чека' });
      }
    }

    return {
      success: true,
      message: `Обработано чеков: ${results.length} успешно, ${errors.length} с ошибками`,
      results,
      errors
    };
  }

  async findAll(currentUser: any) {
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

    return this.prisma.check.findMany({
      where: { superAdminId },
      include: {
        worker: { select: { id: true, fullName: true, passport: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
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

    const check = await this.prisma.check.findUnique({
      where: { id },
      include: { worker: { select: { fullName: true } } }
    });

    if (!check) {
      throw new BadRequestException("Чек не найден");
    }

    if (check.superAdminId !== superAdminId) {
      throw new ForbiddenException("У вас нет прав для удаления этого чека");
    }

    await this.prisma.check.delete({
      where: { id }
    });

    await this.auditLog.log({
      userId: currentUser.id,
      userFullName: user.fullName,
      role: currentUser.role,
      action: 'DELETE',
      entityType: 'Check',
      entityId: check.id,
      description: `Удален чек оплаты для рабочего "${check.worker.fullName}"`,
      superAdminId,
    });

    return {
      success: true,
      message: "Чек успешно удален"
    };
  }
}

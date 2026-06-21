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
      if (payload.upsert) {
        return this.update(existPassport.id, payload, currentUser);
      }
      throw new BadRequestException("Работник с таким паспортом уже существует");
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
        const msg = error.message || '';
        let fieldName = 'уникальное поле';

        console.error('Prisma P2002 Unique Constraint Violation:', {
          target,
          message: msg,
          payload: {
            fullName: payload.fullName,
            passport: payload.passport,
            sicilNo: payload.sicilNo,
            phone: payload.phone,
            patentNo: payload.patentNo,
            inn: payload.inn,
            qrCode: payload.qrCode
          }
        });

        const checkField = (f: string) => {
          if (typeof target === 'string' && target.includes(f)) return true;
          if (Array.isArray(target) && target.some((t: string) => typeof t === 'string' && t.includes(f))) return true;
          if (msg.includes(f)) return true;
          return false;
        };

        if (checkField('passport')) fieldName = 'паспорт (passport)';
        else if (checkField('sicilNo')) fieldName = 'Sicil No';
        else if (checkField('phone')) fieldName = 'номер телефона (phone)';
        else if (checkField('patentNo')) fieldName = 'номер патента (patentNo)';
        else if (checkField('inn')) fieldName = 'ИНН (inn)';
        else if (checkField('qrCode')) fieldName = 'QR-код (qrCode)';

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

  async bulkImport(payload: { workers: CreateWorkerDto[] }, currentUser: any) {
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

    const workersData = payload.workers || [];
    if (workersData.length === 0) {
      return {
        success: true,
        createdCount: 0,
        updatedCount: 0,
        skippedCount: 0,
        errors: [],
      };
    }

    // ─── 1. Find or create groups in bulk ───
    const departments = Array.from(
      new Set(
        workersData
          .map(w => w.department?.trim())
          .filter(Boolean)
      )
    ) as string[];

    const existingGroups = await this.prisma.group.findMany({
      where: { superAdminId, name: { in: departments } },
    });
    const groupMap = new Map<string, number>();
    existingGroups.forEach(g => groupMap.set(g.name.trim().toLowerCase(), g.id));

    for (const deptName of departments) {
      const key = deptName.toLowerCase();
      if (!groupMap.has(key)) {
        const newGroup = await this.prisma.group.create({
          data: { name: deptName, superAdminId, createdBy: user.fullName },
        });
        groupMap.set(key, newGroup.id);
      }
    }

    // ─── 2. Find or create specializations in bulk ───
    const teamDivisions = Array.from(
      new Set(
        workersData
          .map(w => w.teamDivision?.trim())
          .filter(Boolean)
      )
    ) as string[];

    const existingSpecs = await this.prisma.specialization.findMany({
      where: { superAdminId, name: { in: teamDivisions } },
    });
    const specMap = new Map<string, number>();
    existingSpecs.forEach(s => specMap.set(s.name.trim().toLowerCase(), s.id));

    for (const specName of teamDivisions) {
      const key = specName.toLowerCase();
      if (!specMap.has(key)) {
        const newSpec = await this.prisma.specialization.create({
          data: { name: specName, superAdminId, createdBy: user.fullName },
        });
        specMap.set(key, newSpec.id);
      }
    }

    // ─── 3. Load all existing workers of the branch ───
    const existingWorkers = await this.prisma.worker.findMany({
      where: { superAdminId },
      select: {
        id: true,
        passport: true,
        qrCode: true,
        fullName: true,
        fullNameRu: true,
        phone: true,
        position: true,
        hourlyRate: true,
        inn: true,
        campAddress: true,
        constructionSite: true,
        groupId: true,
        specializationId: true,
        patentNo: true,
        patentStartDate: true,
        patentEndDate: true,
        birthDate: true,
        startDate: true,
        gender: true,
        citizenship: true,
        centerNo: true,
        sicilNo: true,
        teamDivision: true,
        department: true,
      },
    });

    const passportMap = new Map<string, typeof existingWorkers[0]>();
    const qrCodeMap = new Map<string, typeof existingWorkers[0]>();

    existingWorkers.forEach(w => {
      if (w.passport) passportMap.set(w.passport.trim().toLowerCase(), w);
      if (w.qrCode) qrCodeMap.set(w.qrCode.trim().toLowerCase(), w);
    });

    // ─── 4. Evaluate and split workers into insert / update / skip pools ───
    const toCreate: any[] = [];
    const toUpdate: { id: number; data: any }[] = [];
    let skippedCount = 0;
    const errors: string[] = [];

    // Helper for safe value normalization & comparison
    const differs = (val1: any, val2: any) => {
      const norm = (v: any) => {
        if (v === null || v === undefined) return '';
        if (v instanceof Date) return v.toISOString().split('T')[0];
        if (typeof v === 'string') {
          const trimmed = v.trim();
          if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
            return trimmed.split('T')[0];
          }
          return trimmed;
        }
        if (typeof v === 'object' && v.constructor?.name === 'Decimal') {
          return Number(v).toFixed(2);
        }
        if (typeof v === 'number') return v.toFixed(2);
        return String(v);
      };
      return norm(val1) !== norm(val2);
    };

    for (let i = 0; i < workersData.length; i++) {
      const wDto = workersData[i];
      const passportKey = wDto.passport?.trim().toLowerCase();
      const qrCodeKey = wDto.qrCode?.trim().toLowerCase() || passportKey;

      if (!passportKey) {
        errors.push(`Строка ${i + 2}: Отсутствует паспорт`);
        continue;
      }

      // Map group and specialization IDs
      let gId: number | undefined = undefined;
      if (wDto.department) {
        gId = groupMap.get(wDto.department.trim().toLowerCase());
      }
      let sId: number | undefined = undefined;
      if (wDto.teamDivision) {
        sId = specMap.get(wDto.teamDivision.trim().toLowerCase());
      }

      // Calculate auxiliary fields
      const workDays = this.calculateDaysUntilBirthday(wDto.birthDate) ?? null;
      let patentEndDate: Date | null = null;
      if (wDto.patentStartDate) {
        const startDate = new Date(wDto.patentStartDate);
        patentEndDate = new Date(startDate);
        patentEndDate.setFullYear(startDate.getFullYear() + 1);
      }

      const existingByPassport = passportMap.get(passportKey);

      if (existingByPassport) {
        // Evaluate for modifications
        const hasChanges =
          differs(existingByPassport.fullName, wDto.fullName) ||
          differs(existingByPassport.fullNameRu, wDto.fullNameRu) ||
          differs(existingByPassport.phone, wDto.phone) ||
          differs(existingByPassport.position, wDto.position) ||
          differs(existingByPassport.hourlyRate, wDto.hourlyRate) ||
          differs(existingByPassport.inn, wDto.inn) ||
          differs(existingByPassport.campAddress, wDto.campAddress) ||
          differs(existingByPassport.constructionSite, wDto.constructionSite) ||
          differs(existingByPassport.groupId, gId) ||
          differs(existingByPassport.specializationId, sId) ||
          differs(existingByPassport.patentNo, wDto.patentNo) ||
          differs(existingByPassport.patentStartDate, wDto.patentStartDate) ||
          differs(existingByPassport.patentEndDate, patentEndDate) ||
          differs(existingByPassport.birthDate, wDto.birthDate) ||
          differs(existingByPassport.startDate, wDto.startDate) ||
          differs(existingByPassport.gender, wDto.gender) ||
          differs(existingByPassport.citizenship, wDto.citizenship) ||
          differs(existingByPassport.centerNo, wDto.centerNo) ||
          differs(existingByPassport.sicilNo, wDto.sicilNo) ||
          differs(existingByPassport.qrCode, wDto.qrCode || wDto.passport);

        if (hasChanges) {
          toUpdate.push({
            id: existingByPassport.id,
            data: {
              fullName: wDto.fullName,
              fullNameRu: wDto.fullNameRu || null,
              phone: wDto.phone || null,
              position: wDto.position || null,
              hourlyRate: wDto.hourlyRate || null,
              inn: wDto.inn || null,
              campAddress: wDto.campAddress || null,
              constructionSite: wDto.constructionSite || null,
              groupId: gId || null,
              specializationId: sId || null,
              patentNo: wDto.patentNo || null,
              patentStartDate: wDto.patentStartDate ? new Date(wDto.patentStartDate) : null,
              patentEndDate: patentEndDate,
              birthDate: wDto.birthDate ? new Date(wDto.birthDate) : null,
              startDate: wDto.startDate ? new Date(wDto.startDate) : null,
              gender: wDto.gender || null,
              citizenship: wDto.citizenship || 'UZ',
              centerNo: wDto.centerNo || null,
              sicilNo: wDto.sicilNo || null,
              qrCode: wDto.qrCode || wDto.passport,
              teamDivision: wDto.teamDivision || null,
              department: wDto.department || null,
              workDays: workDays,
            },
          });
        } else {
          skippedCount++;
        }
      } else {
        // Verify QR uniqueness
        const existingByQr = qrCodeMap.get(qrCodeKey);
        if (existingByQr) {
          errors.push(
            `Строка ${i + 2} (${wDto.fullName}): QR-код ${wDto.qrCode || wDto.passport} уже занят другим сотрудником (${existingByQr.fullName})`
          );
          continue;
        }

        // Add to creation queue
        const newWorkerData = {
          fullName: wDto.fullName,
          fullNameRu: wDto.fullNameRu || null,
          passport: wDto.passport,
          phone: wDto.phone || null,
          position: wDto.position || null,
          hourlyRate: wDto.hourlyRate || null,
          inn: wDto.inn || null,
          campAddress: wDto.campAddress || null,
          constructionSite: wDto.constructionSite || null,
          groupId: gId || null,
          specializationId: sId || null,
          patentNo: wDto.patentNo || null,
          patentStartDate: wDto.patentStartDate ? new Date(wDto.patentStartDate) : null,
          patentEndDate: patentEndDate,
          birthDate: wDto.birthDate ? new Date(wDto.birthDate) : null,
          startDate: wDto.startDate ? new Date(wDto.startDate) : null,
          gender: wDto.gender || null,
          citizenship: wDto.citizenship || 'UZ',
          centerNo: wDto.centerNo || null,
          sicilNo: wDto.sicilNo || null,
          qrCode: wDto.qrCode || wDto.passport,
          teamDivision: wDto.teamDivision || null,
          department: wDto.department || null,
          workDays: workDays,
          superAdminId: superAdminId,
          createdBy: user.fullName,
        };

        toCreate.push(newWorkerData);

        // Put in local maps to catch duplicates within the Excel sheet itself!
        passportMap.set(passportKey, { id: 0, ...newWorkerData } as any);
        qrCodeMap.set(qrCodeKey, { id: 0, ...newWorkerData } as any);
      }
    }

    // ─── 5. Execute DB Writes ───
    if (toCreate.length > 0) {
      await this.prisma.worker.createMany({
        data: toCreate,
      });
    }

    for (let i = 0; i < toUpdate.length; i += 50) {
      const chunk = toUpdate.slice(i, i + 50);
      await Promise.all(
        chunk.map(item =>
          this.prisma.worker.update({
            where: { id: item.id },
            data: item.data,
          })
        )
      );
    }

    await this.auditLog.log({
      userId: currentUser.id,
      userFullName: user.fullName,
      role: currentUser.role,
      action: 'UPDATE',
      entityType: 'Worker',
      entityId: superAdminId,
      description: `Импорт списка рабочих: Создано=${toCreate.length}, Обновлено=${toUpdate.length}, Пропущено=${skippedCount}, Ошибок=${errors.length}`,
      superAdminId,
    });

    return {
      success: true,
      createdCount: toCreate.length,
      updatedCount: toUpdate.length,
      skippedCount,
      errors,
    };
  }

  async findAll(currentUser: any, query?: { name?: string; passport?: string; qr?: string; job?: string; brigade?: string; color?: string; page?: string | number; limit?: string | number; isActive?: string | boolean; search?: string; birthdayDays?: string }) {
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

    if (query?.isActive !== undefined) {
      where.isActive = query.isActive === 'true' || query.isActive === true;
    }

    if (query?.search) {
      where.OR = [
        { fullName: { contains: query.search, mode: 'insensitive' } },
        { passport: { contains: query.search, mode: 'insensitive' } },
        { qrCode: { contains: query.search, mode: 'insensitive' } },
      ];
    }

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

    const hasBirthdayDaysFilter = query?.birthdayDays !== undefined && query.birthdayDays !== '';
    const page = query?.page ? Number(query.page) : undefined;
    const limit = query?.limit ? Number(query.limit) : 10;

    let totalCount = 0;
    let totalPages = 0;

    if (page !== undefined && !hasBirthdayDaysFilter) {
      totalCount = await this.prisma.worker.count({ where });
      totalPages = Math.ceil(totalCount / limit);
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
      ...((page !== undefined && !hasBirthdayDaysFilter) && {
        skip: (page - 1) * limit,
        take: limit,
      }),
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let mapped = workers.map(worker => {
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

    if (hasBirthdayDaysFilter) {
      const daysVal = Number(query.birthdayDays);
      mapped = mapped.filter(w => {
        if (!w.birthDate) return false;
        const remaining = this.calculateDaysUntilBirthday(w.birthDate.toISOString());
        return remaining === daysVal;
      });

      if (page !== undefined) {
        totalCount = mapped.length;
        totalPages = Math.ceil(totalCount / limit);
        mapped = mapped.slice((page - 1) * limit, page * limit);
      }
    }

    if (page !== undefined) {
      const [totalWorkersCount, activeWorkersCount] = await Promise.all([
        this.prisma.worker.count({ where: { superAdminId } }),
        this.prisma.worker.count({ where: { superAdminId, isActive: true } }),
      ]);
      return {
        data: mapped,
        totalCount,
        totalPages,
        currentPage: page,
        stats: {
          total: totalWorkersCount,
          active: activeWorkersCount,
          archive: totalWorkersCount - activeWorkersCount,
        }
      };
    }

    return mapped;
  }

  async findBirthdaysToday(currentUser: any) {
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

    // Fetch all active workers with non-null birthday
    const workers = await this.prisma.worker.findMany({
      where: {
        superAdminId,
        isActive: true,
        birthDate: { not: null },
      },
      select: {
        id: true,
        fullName: true,
        passport: true,
        birthDate: true,
      }
    });

    const today = new Date();
    const currentMonth = today.getMonth();
    const currentDate = today.getDate();

    const birthdayWorkers = workers.filter(w => {
      if (!w.birthDate) return false;
      const bDate = new Date(w.birthDate);
      return bDate.getMonth() === currentMonth && bDate.getDate() === currentDate;
    });

    return birthdayWorkers;
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

import { Injectable, ForbiddenException, BadRequestException } from "@nestjs/common";
import { Role } from "@prisma/client";
import { PrismaService } from "src/prisma/prisma.service";
import { CreateSpecializationDto, UpdateSpecializationDto } from "./dto/create-specialization.dto";
import { AuditLogService } from "../audit-log/audit-log.service";

@Injectable()
export class SpecializationService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly auditLog: AuditLogService,
    ) { }

    async create(payload: CreateSpecializationDto, currentUser: { id: number; role: Role; superAdminId: number | null }) {
        let superAdminId: number;

        if (currentUser.role === Role.SUPER_ADMIN) {
            superAdminId = currentUser.id;
        } else if (currentUser.role === Role.ADMIN) {
            if (!currentUser.superAdminId) {
                throw new ForbiddenException('У вас нет прав для выполнения этого действия');
            }
            superAdminId = currentUser.superAdminId;
        } else {
            throw new ForbiddenException('У вас нет прав для выполнения этого действия');
        }

        const existing = await this.prisma.specialization.findFirst({
            where: {
                name: { equals: payload.name, mode: 'insensitive' },
                superAdminId,
            },
        });
        if (existing) {
            throw new BadRequestException('Специализация с таким названием уже существует');
        }

        const creator = await this.prisma.user.findUnique({
            where: { id: currentUser.id },
            select: { fullName: true },
        });
        const createdBy = creator?.fullName || 'System';

        const specialization = await this.prisma.specialization.create({
            data: {
                name: payload.name,
                superAdminId,
                createdBy,
            },
        });

        await this.auditLog.log({
            userId: currentUser.id,
            userFullName: createdBy,
            role: currentUser.role,
            action: 'CREATE',
            entityType: 'Specialization',
            entityId: specialization.id,
            description: `Создана специализация "${specialization.name}"`,
            superAdminId,
        });

        return specialization;
    }

    async findOrCreate(payload: CreateSpecializationDto, currentUser: { id: number; role: Role; superAdminId: number | null }) {
        const superAdminId = currentUser.role === Role.SUPER_ADMIN
            ? currentUser.id
            : currentUser.superAdminId;

        if (!superAdminId) throw new ForbiddenException('У вас нет прав для выполнения этого действия');

        const name = payload.name.trim();

        // Mavjudini qidirish
        let spec = await this.prisma.specialization.findFirst({
            where: { name: { equals: name, mode: 'insensitive' }, superAdminId },
        });

        if (!spec) {
            const creator = await this.prisma.user.findUnique({
                where: { id: currentUser.id },
                select: { fullName: true },
            });
            const createdBy = creator?.fullName || 'System';

            spec = await this.prisma.specialization.create({
                data: { name, superAdminId, createdBy },
            });

            await this.auditLog.log({
                userId: currentUser.id,
                userFullName: createdBy,
                role: currentUser.role,
                action: 'CREATE',
                entityType: 'Specialization',
                entityId: spec.id,
                description: `Import orqali ixtisoslik yaratildi: "${spec.name}"`,
                superAdminId,
            });
        }

        return { id: spec.id, name: spec.name };
    }

    async findAll(currentUser: { id: number; role: Role; superAdminId: number | null }) {
        if (currentUser.role === Role.PLATFORM_SUPER_ADMIN) {
            return this.prisma.specialization.findMany({
                orderBy: { createdAt: 'desc' },
            });
        }

        const superAdminId = currentUser.role === Role.SUPER_ADMIN
            ? currentUser.id
            : currentUser.superAdminId;

        if (!superAdminId) {
            throw new ForbiddenException('У вас нет prav для выполнения этого действия');
        }

        return this.prisma.specialization.findMany({
            where: { superAdminId },
            orderBy: { createdAt: 'desc' },
        });
    }

    async findOne(id: number, currentUser: { id: number; role: Role; superAdminId: number | null }) {
        const specialization = await this.prisma.specialization.findUnique({
            where: { id },
        });

        if (!specialization) {
            throw new BadRequestException('Специализация не найдена');
        }

        // Check scope access
        if (currentUser.role === Role.PLATFORM_SUPER_ADMIN) {
            return specialization;
        }

        const superAdminId = currentUser.role === Role.SUPER_ADMIN
            ? currentUser.id
            : currentUser.superAdminId;

        if (specialization.superAdminId !== superAdminId) {
            throw new ForbiddenException('У вас нет прав для выполнения этого действия');
        }

        return specialization;
    }

    async update(id: number, payload: UpdateSpecializationDto, currentUser: { id: number; role: Role; superAdminId: number | null }) {
        const specialization = await this.prisma.specialization.findUnique({
            where: { id },
        });

        if (!specialization) {
            throw new BadRequestException('Специализация не найдена');
        }

        // Authorize access
        if (currentUser.role === Role.SUPERVISOR) {
            throw new ForbiddenException('У вас нет прав для выполнения этого действия');
        }

        if (currentUser.role !== Role.PLATFORM_SUPER_ADMIN) {
            const superAdminId = currentUser.role === Role.SUPER_ADMIN
                ? currentUser.id
                : currentUser.superAdminId;

            if (specialization.superAdminId !== superAdminId) {
                throw new ForbiddenException('У вас нет prav для выполнения этого действия');
            }
        }

        // Check duplicate name if changing the name
        if (payload.name && payload.name.toLowerCase() !== specialization.name.toLowerCase()) {
            const existing = await this.prisma.specialization.findFirst({
                where: {
                    name: { equals: payload.name, mode: 'insensitive' },
                    superAdminId: specialization.superAdminId,
                    id: { not: id },
                },
            });
            if (existing) {
                throw new BadRequestException('Специализация с таким названием уже существует');
            }
        }

        const creator = await this.prisma.user.findUnique({
            where: { id: currentUser.id },
            select: { fullName: true },
        });
        const userFullName = creator?.fullName || 'System';

        const oldName = specialization.name;
        const updatedSpecialization = await this.prisma.specialization.update({
            where: { id },
            data: {
                name: payload.name,
            },
        });

        const logSuperAdminId = currentUser.role === Role.SUPER_ADMIN
            ? currentUser.id
            : (currentUser.superAdminId || specialization.superAdminId);

        await this.auditLog.log({
            userId: currentUser.id,
            userFullName,
            role: currentUser.role,
            action: 'UPDATE',
            entityType: 'Specialization',
            entityId: specialization.id,
            description: `Обновлено название специализации с "${oldName}" на "${updatedSpecialization.name}"`,
            superAdminId: logSuperAdminId,
        });

        return updatedSpecialization;
    }

    async remove(id: number, currentUser: { id: number; role: Role; superAdminId: number | null }) {
        const specialization = await this.prisma.specialization.findUnique({
            where: { id },
        });

        if (!specialization) {
            throw new BadRequestException('Специализация не найдена');
        }

        // Authorize access
        if (currentUser.role === Role.SUPERVISOR) {
            throw new ForbiddenException('У вас нет прав для выполнения этого действия');
        }

        if (currentUser.role !== Role.PLATFORM_SUPER_ADMIN) {
            const superAdminId = currentUser.role === Role.SUPER_ADMIN
                ? currentUser.id
                : currentUser.superAdminId;

            if (specialization.superAdminId !== superAdminId) {
                throw new ForbiddenException('У вас нет prav для выполнения этого действия');
            }
        }

        const countWorkers = await this.prisma.worker.count({
            where: { specializationId: id },
        });
        if (countWorkers > 0) {
            throw new BadRequestException('Невозможно удалить специализацию, так как она используется у рабочих');
        }

        const creator = await this.prisma.user.findUnique({
            where: { id: currentUser.id },
            select: { fullName: true },
        });
        const userFullName = creator?.fullName || 'System';

        await this.prisma.specialization.delete({
            where: { id },
        });

        const logSuperAdminId = currentUser.role === Role.SUPER_ADMIN
            ? currentUser.id
            : (currentUser.superAdminId || specialization.superAdminId);

        await this.auditLog.log({
            userId: currentUser.id,
            userFullName,
            role: currentUser.role,
            action: 'DELETE',
            entityType: 'Specialization',
            entityId: specialization.id,
            description: `Удалена специализация "${specialization.name}"`,
            superAdminId: logSuperAdminId,
        });

        return {
            success: true,
            message: 'Специализация успешно удалена',
        };
    }
}

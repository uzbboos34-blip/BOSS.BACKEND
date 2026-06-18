import { Injectable, ForbiddenException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { CreateGroupDto, UpdateGroupDto } from "./dto/create-group.dto";
import { Role } from "@prisma/client";
import { AuditLogService } from "../audit-log/audit-log.service";

@Injectable()
export class GroupService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly auditLog: AuditLogService,
    ) { }

    async create(payload: CreateGroupDto, currentUser: { id: number; role: Role; superAdminId: number | null }) {
        const user = await this.prisma.user.findUnique({
            where: { id: currentUser.id, isBlocked: false, isActive: true },
            select: { fullName: true, superAdminId: true }
        });
        if (!user) {
            throw new ForbiddenException('Пользователь не найден');
        }

        const superAdminId = currentUser.role === Role.SUPER_ADMIN
            ? currentUser.id
            : user.superAdminId;

        if (!superAdminId) {
            throw new BadRequestException('Не удалось определить филиал');
        }

        const existingGroup = await this.prisma.group.findFirst({
            where: {
                name: payload.name,
                superAdminId,
            },
        });

        if (existingGroup) {
            throw new BadRequestException('Группа с таким названием уже существует');
        }

        const group = await this.prisma.group.create({
            data: {
                name: payload.name,
                superAdminId,
                createdBy: user.fullName,
            },
        });

        await this.auditLog.log({
            userId: currentUser.id,
            userFullName: user.fullName,
            role: currentUser.role,
            action: 'CREATE',
            entityType: 'Group',
            entityId: group.id,
            description: `Создана группа "${group.name}"`,
            superAdminId,
        });

        return {
            success: true,
            message: "Группа успешно создана"
        };
    }

    async findOrCreate(payload: CreateGroupDto, currentUser: { id: number; role: Role; superAdminId: number | null }) {
        const user = await this.prisma.user.findUnique({
            where: { id: currentUser.id, isBlocked: false, isActive: true },
            select: { fullName: true, superAdminId: true }
        });
        if (!user) throw new ForbiddenException('Пользователь не найден');

        const superAdminId = currentUser.role === Role.SUPER_ADMIN
            ? currentUser.id
            : user.superAdminId;

        if (!superAdminId) throw new BadRequestException('Не удалось определить филиал');

        const name = payload.name.trim();

        // Avval mavjud guruhni qidirish (case-insensitive)
        let group = await this.prisma.group.findFirst({
            where: {
                superAdminId,
                name: { equals: name, mode: 'insensitive' },
            },
        });

        if (!group) {
            // Yo'q bo'lsa — yaratish
            group = await this.prisma.group.create({
                data: {
                    name,
                    superAdminId,
                    createdBy: user.fullName,
                },
            });

            await this.auditLog.log({
                userId: currentUser.id,
                userFullName: user.fullName,
                role: currentUser.role,
                action: 'CREATE',
                entityType: 'Group',
                entityId: group.id,
                description: `Import orqali guruh yaratildi: "${group.name}"`,
                superAdminId,
            });
        }

        return { id: group.id, name: group.name };
    }

    async findAll(currentUser: { id: number; role: Role; superAdminId: number | null }) {
        const user = await this.prisma.user.findUnique({
            where: { id: currentUser.id, isBlocked: false, isActive: true },
            select: { fullName: true, superAdminId: true }
        });
        if (!user) {
            throw new ForbiddenException('Пользователь не найден');
        }

        const superAdminId = currentUser.role === Role.SUPER_ADMIN
            ? currentUser.id
            : user.superAdminId;

        if (!superAdminId) {
            throw new BadRequestException('Не удалось определить филиал');
        }

        const groups = await this.prisma.group.findMany({
            where: { superAdminId },
            include: {
                workers: {
                    select: {
                        specialization: {
                            select: {
                                id: true,
                                name: true,
                            }
                        }
                    }
                },
                _count: {
                    select: { workers: true }
                }
            },
            orderBy: { createdAt: 'desc' },
        });

        return groups.map(group => {
            const specializationsMap = new Map<number, { id: number; name: string }>();
            for (const worker of group.workers) {
                if (worker.specialization) {
                    specializationsMap.set(worker.specialization.id, worker.specialization);
                }
            }
            const specializations = Array.from(specializationsMap.values());
            const { workers, ...groupData } = group;
            return {
                ...groupData,
                specializations,
            };
        });
    }

    async findOne(id: number, currentUser: { id: number; role: Role; superAdminId: number | null }) {
        const user = await this.prisma.user.findUnique({
            where: { id: currentUser.id, isBlocked: false, isActive: true },
            select: { fullName: true, superAdminId: true }
        });
        if (!user) {
            throw new ForbiddenException('Пользователь не найден');
        }

        const superAdminId = currentUser.role === Role.SUPER_ADMIN
            ? currentUser.id
            : user.superAdminId;

        if (!superAdminId) {
            throw new BadRequestException('Не удалось определить филиал');
        }

        const group = await this.prisma.group.findUnique({
            where: { id },
            include: {
                workers: {
                    select: {
                        specialization: {
                            select: {
                                id: true,
                                name: true,
                            }
                        }
                    }
                },
                _count: {
                    select: { workers: true }
                }
            },
        });

        if (!group) {
            throw new BadRequestException('Группа не найдена');
        }

        if (group.superAdminId !== superAdminId) {
            throw new ForbiddenException('У вас нет прав для выполнения этого действия');
        }

        const specializationsMap = new Map<number, { id: number; name: string }>();
        for (const worker of group.workers) {
            if (worker.specialization) {
                specializationsMap.set(worker.specialization.id, worker.specialization);
            }
        }
        const specializations = Array.from(specializationsMap.values());
        const { workers, ...groupData } = group;
        return {
            ...groupData,
            specializations,
        };
    }

    async update(id: number, payload: UpdateGroupDto, currentUser: { id: number; role: Role; superAdminId: number | null }) {
        const user = await this.prisma.user.findUnique({
            where: { id: currentUser.id, isBlocked: false, isActive: true },
            select: { fullName: true, superAdminId: true }
        });
        if (!user) {
            throw new ForbiddenException('Пользователь не найден');
        }

        const superAdminId = currentUser.role === Role.SUPER_ADMIN
            ? currentUser.id
            : user.superAdminId;

        if (!superAdminId) {
            throw new BadRequestException('Не удалось определить филиал');
        }

        const group = await this.prisma.group.findUnique({
            where: { id },
        });

        if (!group) {
            throw new BadRequestException('Группа не найдена');
        }

        if (group.superAdminId !== superAdminId) {
            throw new ForbiddenException('У вас нет прав для выполнения этого действия');
        }

        const oldName = group.name;
        const updatedGroup = await this.prisma.group.update({
            where: { id },
            data: {
                name: payload.name,
                createdBy: user.fullName,
            },
        });

        await this.auditLog.log({
            userId: currentUser.id,
            userFullName: user.fullName,
            role: currentUser.role,
            action: 'UPDATE',
            entityType: 'Group',
            entityId: group.id,
            description: `Обновлено название группы с "${oldName}" на "${updatedGroup.name}"`,
            superAdminId,
        });

        return {
            success: true,
            message: "Группа успешно обновлена"
        };
    }

    async remove(id: number, currentUser: { id: number; role: Role; superAdminId: number | null }) {
        const user = await this.prisma.user.findUnique({
            where: { id: currentUser.id, isBlocked: false, isActive: true },
            select: { fullName: true, superAdminId: true }
        });
        if (!user) {
            throw new ForbiddenException('Пользователь не найден');
        }

        const superAdminId = currentUser.role === Role.SUPER_ADMIN
            ? currentUser.id
            : user.superAdminId;

        if (!superAdminId) {
            throw new BadRequestException('Не удалось определить филиал');
        }

        const group = await this.prisma.group.findUnique({
            where: { id },
        });

        if (!group) {
            throw new BadRequestException('Группа не найдена');
        }

        if (group.superAdminId !== superAdminId) {
            throw new ForbiddenException('У вас нет прав для выполнения этого действия');
        }

        await this.prisma.group.delete({
            where: { id },
        });

        await this.auditLog.log({
            userId: currentUser.id,
            userFullName: user.fullName,
            role: currentUser.role,
            action: 'DELETE',
            entityType: 'Group',
            entityId: group.id,
            description: `Удалена группа "${group.name}"`,
            superAdminId,
        });

        return {
            success: true,
            message: "Группа успешно удалена"
        };
    }

    
}
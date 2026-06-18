import { BadRequestException, ForbiddenException, Injectable } from "@nestjs/common";
import { Role } from "@prisma/client";
import { PrismaService } from "src/prisma/prisma.service";
import * as bcrypt from "bcrypt";
import { CreateUserDto, UpdateUserDto } from "./dto/create-user-dto";
import { AuditLogService } from "../audit-log/audit-log.service";


@Injectable()
export class UserService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly auditLog: AuditLogService,
    ) { }


    async findAll(currentUser: { id: number; role: Role; superAdminId: number | null }) {

        if (currentUser.role === Role.PLATFORM_SUPER_ADMIN) {
            return this.prisma.user.findMany({
                select: {
                    id: true,
                    fullName: true,
                    phone: true,
                    role: true,
                    isActive: true,
                    isBlocked: true,
                    createdAt: true,
                    createdBy: true,
                }
            });
        }
        if (currentUser.role === Role.SUPER_ADMIN) {
            return this.prisma.user.findMany({
                where: {
                    superAdminId: currentUser.id,
                    role: { notIn: [Role.PLATFORM_SUPER_ADMIN, Role.SUPER_ADMIN] }
                },
                select: {
                    id: true,
                    fullName: true,
                    phone: true,
                    role: true,
                    isActive: true,
                    isBlocked: true,
                    createdAt: true,
                    createdBy: true,
                    
                }
            });
        }

        if (currentUser.role === Role.ADMIN) {
            return this.prisma.user.findMany({
                where: {
                    superAdminId: currentUser.superAdminId,
                    role: Role.SUPERVISOR
                },
                select: {
                    id: true,
                    fullName: true,
                    phone: true,
                    role: true,
                    isActive: true,
                    isBlocked: true,
                    createdAt: true,
                    createdBy:true
                }
            });
        }

        throw new ForbiddenException('У вас нет прав для выполнения этого действия');
    }

    async createSuperAdmin(
        payload: CreateUserDto,
        currentUser: { id: number; role: Role },
    ) {
        if (currentUser.role !== Role.PLATFORM_SUPER_ADMIN) {
            throw new ForbiddenException('У вас нет прав для выполнения этого действия');
        }

        const existing = await this.prisma.user.findUnique({
            where: { phone: payload.phone },
        });
        if (existing) {
            throw new BadRequestException('Пользователь с таким номером уже существует');
        }

        const user = await this.prisma.user.findUnique({
            where: { id: currentUser.id },
            select: {
                fullName: true,
                phone: true,
                role: true,
                superAdminId: true,
            },
        });

        if(!user){
            throw new BadRequestException('Пользователь не найден');
        }

        const hashedPassword = await bcrypt.hash(payload.password, 10);

        const createdUser = await this.prisma.user.create({
            data: {
                fullName: payload.fullName,
                phone: payload.phone,
                password: hashedPassword,
                role: Role.SUPER_ADMIN,
                superAdminId: null,
                createdBy: user.fullName,
            }
        });

        await this.auditLog.log({
            userId: currentUser.id,
            userFullName: user.fullName,
            role: currentUser.role,
            action: 'CREATE',
            entityType: 'User',
            entityId: createdUser.id,
            description: `Создан Super Admin "${createdUser.fullName}"`,
            superAdminId: createdUser.id,
        });

        return {
            success: true,
            message: 'Пользователь успешно создан',
        };
    }

    async createAdmin(
        payload: CreateUserDto,
        currentUser: { id: number; role: Role },
    ) {
        if (currentUser.role !== Role.SUPER_ADMIN) {
            throw new ForbiddenException('У вас нет прав для выполнения этого действия');
        }

        const existing = await this.prisma.user.findUnique({
            where: { phone: payload.phone },
        });
        if (existing) {
            throw new BadRequestException('Пользователь с таким номером уже существует');
        }

        const user = await this.prisma.user.findUnique({
            where: { id: currentUser.id },
            select: {
                fullName: true,
                phone: true,
                role: true,
                superAdminId: true,
            },
        });

        if(!user){
            throw new BadRequestException('Пользователь не найден');
        }

        const hashedPassword = await bcrypt.hash(payload.password, 10);

        const createdUser = await this.prisma.user.create({
            data: {
                fullName: payload.fullName,
                phone: payload.phone,
                password: hashedPassword,
                role: Role.ADMIN,
                superAdminId: currentUser.id,
                createdBy: user.fullName,
            }
        });

        await this.auditLog.log({
            userId: currentUser.id,
            userFullName: user.fullName,
            role: currentUser.role,
            action: 'CREATE',
            entityType: 'User',
            entityId: createdUser.id,
            description: `Создан Admin "${createdUser.fullName}"`,
            superAdminId: currentUser.id,
        });

        return {
            success: true,
            message: 'Пользователь успешно создан',
        };
    }

    async createSupervisor(
        payload: CreateUserDto,
        currentUser: { id: number; role: Role; superAdminId: number | null },
    ) {
        if (currentUser.role !== Role.SUPER_ADMIN && currentUser.role !== Role.ADMIN) {
            throw new ForbiddenException('У вас нет прав для выполнения этого действия');
        }

        const existing = await this.prisma.user.findUnique({
            where: { phone: payload.phone },
        });
        if (existing) {
            throw new BadRequestException('Пользователь с таким номером уже существует');
        }

        const user = await this.prisma.user.findUnique({
            where: { id: currentUser.id },
            select: {
                fullName: true,
                phone: true,
                role: true,
                superAdminId: true,
            },
        });

        if(!user){
            throw new BadRequestException('Пользователь не найден');
        }

        const hashedPassword = await bcrypt.hash(payload.password, 10);
        const superAdminId =
            currentUser.role === Role.SUPER_ADMIN
                ? currentUser.id
                : currentUser.superAdminId;

        const createdUser = await this.prisma.user.create({
            data: {
                fullName: payload.fullName,
                phone: payload.phone,
                password: hashedPassword,
                role: Role.SUPERVISOR,
                superAdminId,
                createdBy: user.fullName,
            }
        });

        await this.auditLog.log({
            userId: currentUser.id,
            userFullName: user.fullName,
            role: currentUser.role,
            action: 'CREATE',
            entityType: 'User',
            entityId: createdUser.id,
            description: `Создан Supervisor "${createdUser.fullName}"`,
            superAdminId: superAdminId!,
        });

        return {
            success: true,
            message: 'Пользователь успешно создан',
        };
    }

    async getUserById(id: number, currentUser: { id: number; role: Role; superAdminId: number | null }) {
        if (currentUser.role === Role.PLATFORM_SUPER_ADMIN) {
            return this.prisma.user.findUnique({
                where: { id },
                select: {
                    id: true,
                    fullName: true,
                    phone: true,
                    role: true,
                    isActive: true,
                    isBlocked: true,
                    createdAt: true,
                    createdBy: true,
                }
            });
        }
        if (currentUser.role === Role.SUPER_ADMIN) {
            return this.prisma.user.findUnique({
                where: { id, superAdminId: currentUser.id },
                select: {
                    id: true,
                    fullName: true,
                    phone: true,
                    role: true,
                    isActive: true,
                    isBlocked: true,
                    createdAt: true,
                    createdBy: true,
                }
            });
        }
        if (currentUser.role === Role.ADMIN) {
            return this.prisma.user.findUnique({
                where: { id, superAdminId: currentUser.superAdminId, role: Role.SUPERVISOR },
                select: {
                    id: true,
                    fullName: true,
                    phone: true,
                    role: true,
                    isActive: true,
                    isBlocked: true,
                    createdAt: true,
                    createdBy: true,
                }
            });
        }
        throw new ForbiddenException('У вас нет прав для выполнения этого действия');
    }

    async updateUser(id: number, payload: UpdateUserDto, currentUser: { id: number; role: Role; superAdminId: number | null }) {
        if (currentUser.id === id) {
            throw new ForbiddenException('Вы не можете обновить самого себя');
        }

        const targetUser = await this.prisma.user.findUnique({
            where: { id },
        });
        if (!targetUser) {
            throw new BadRequestException('Пользователь не найден');
        }
        if (currentUser.role === Role.PLATFORM_SUPER_ADMIN) {
            
        } else if (currentUser.role === Role.SUPER_ADMIN) {
            const canUpdate = 
                targetUser.superAdminId === currentUser.id && 
                (targetUser.role === Role.ADMIN || targetUser.role === Role.SUPERVISOR);
            if (!canUpdate) {
                throw new ForbiddenException('У вас нет прав для выполнения этого действия');
            }
        } else if (currentUser.role === Role.ADMIN) {
            const canUpdate = 
                targetUser.superAdminId === currentUser.superAdminId && 
                targetUser.role === Role.SUPERVISOR;
            if (!canUpdate) {
                throw new ForbiddenException('У вас нет прав для выполнения этого действия');
            }
        } else {
            throw new ForbiddenException('У вас нет прав для выполнения этого действия');
        }


        if (payload.phone && payload.phone !== targetUser.phone) {
            const existing = await this.prisma.user.findUnique({
                where: { phone: payload.phone },
            });
            if (existing) {
                throw new BadRequestException('Пользователь с таким номером уже существует');
            }
        }

        const updateData: any = {};
        if (payload.fullName) updateData.fullName = payload.fullName;
        if (payload.phone) updateData.phone = payload.phone;
        if (payload.password) {
            updateData.password = await bcrypt.hash(payload.password, 10);
        }
        if (payload.isActive !== undefined) updateData.isActive = payload.isActive;
        if (payload.isBlocked !== undefined) updateData.isBlocked = payload.isBlocked;

        const creator = await this.prisma.user.findUnique({
            where: { id: currentUser.id },
            select: { fullName: true },
        });
        const userFullName = creator?.fullName || 'System';

        const updatedUser = await this.prisma.user.update({
            where: { id },
            data: updateData,
        });

        const logSuperAdminId = currentUser.role === Role.SUPER_ADMIN
            ? currentUser.id
            : (currentUser.superAdminId || targetUser.superAdminId || updatedUser.id);

        await this.auditLog.log({
            userId: currentUser.id,
            userFullName,
            role: currentUser.role,
            action: 'UPDATE',
            entityType: 'User',
            entityId: targetUser.id,
            description: `Обновлены данные пользователя "${targetUser.fullName}" (роль: ${targetUser.role})`,
            superAdminId: logSuperAdminId!,
        });

        return {
            success: true,
            message: 'Пользователь успешно обновлен',
        };
    }

    async deleteUser(id: number, currentUser: { id: number; role: Role; superAdminId: number | null }) {
        const user = await this.prisma.user.findUnique({
            where: { id },
        });
        if(!user){
            throw new BadRequestException('Пользователь не найден');
        }
        const creator = await this.prisma.user.findUnique({
            where: { id: currentUser.id },
            select: { fullName: true },
        });
        const userFullName = creator?.fullName || 'System';

        let deletedUser;
        if (currentUser.role === Role.PLATFORM_SUPER_ADMIN) {
            deletedUser = await this.prisma.user.update({
                where: { id },
                data: {
                    isActive: false,
                    isBlocked: true,
                }
            });
        } else if (currentUser.role === Role.SUPER_ADMIN) {
            deletedUser = await this.prisma.user.update({
                where: { id, superAdminId: currentUser.id },
                data: {
                    isActive: false,
                }
            });
        } else if (currentUser.role === Role.ADMIN) {
            deletedUser = await this.prisma.user.update({
                where: { id, superAdminId: currentUser.superAdminId, role: Role.SUPERVISOR },
                data: {
                    isActive: false,
                }
            });
        } else {
            throw new ForbiddenException('У вас нет прав для выполнения этого действия');
        }

        const logSuperAdminId = currentUser.role === Role.SUPER_ADMIN
            ? currentUser.id
            : (currentUser.superAdminId || user.superAdminId || user.id);

        await this.auditLog.log({
            userId: currentUser.id,
            userFullName,
            role: currentUser.role,
            action: 'DELETE',
            entityType: 'User',
            entityId: user.id,
            description: `Удален (деактивирован) пользователь "${user.fullName}" (роль: ${user.role})`,
            superAdminId: logSuperAdminId!,
        });

        return deletedUser;
    }   
}
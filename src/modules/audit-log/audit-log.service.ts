import { Injectable } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { Role } from "@prisma/client";

@Injectable()
export class AuditLogService {
    constructor(private readonly prisma: PrismaService) {}

    async log(params: {
        userId: number;
        userFullName: string;
        role: Role;
        action: string;
        entityType: string;
        entityId?: number;
        description: string;
        superAdminId: number;
    }) {
        return this.prisma.actionLog.create({
            data: params,
        });
    }

    async findAll(superAdminId: number, query?: { action?: string; entityType?: string; search?: string }) {
        const where: any = { superAdminId };

        if (query?.action) {
            where.action = query.action;
        }

        if (query?.entityType) {
            where.entityType = query.entityType;
        }

        if (query?.search) {
            where.OR = [
                { userFullName: { contains: query.search, mode: 'insensitive' } },
                { description: { contains: query.search, mode: 'insensitive' } },
            ];
        }

        return this.prisma.actionLog.findMany({
            where,
            orderBy: { createdAt: 'desc' },
        });
    }
}

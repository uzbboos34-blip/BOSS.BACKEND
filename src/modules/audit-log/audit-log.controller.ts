import { Controller, Get, Query, Req, UseGuards } from "@nestjs/common";
import { AuditLogService } from "./audit-log.service";
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from "@nestjs/swagger";
import { AuthGuard } from "src/common/guards/token.guard";
import { RoleGuard } from "src/common/guards/role.guard";
import { Roles } from "src/common/decorators/roles";
import { Role } from "@prisma/client";

@ApiTags('audit-log')
@Controller('audit-log')
@ApiBearerAuth()
export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @UseGuards(AuthGuard, RoleGuard)
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get audit logs for the branch' })
  @ApiQuery({ name: 'action', required: false })
  @ApiQuery({ name: 'entityType', required: false })
  @ApiQuery({ name: 'search', required: false })
  @Get()
  findAll(
    @Req() req: any,
    @Query('action') action?: string,
    @Query('entityType') entityType?: string,
    @Query('search') search?: string,
  ) {
    const currentUser = req['user'];
    const superAdminId = currentUser.role === Role.SUPER_ADMIN
        ? currentUser.id
        : currentUser.superAdminId;
        
    return this.auditLogService.findAll(superAdminId, { action, entityType, search });
  }
}

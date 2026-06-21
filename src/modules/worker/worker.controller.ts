import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Req, UseGuards, Query } from "@nestjs/common";
import { WorkerService } from "./worker.service";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { AuthGuard } from "src/common/guards/token.guard";
import { RoleGuard } from "src/common/guards/role.guard";
import { Roles } from "src/common/decorators/roles";
import { Role } from "@prisma/client";
import { CreateWorkerDto, UpdateWorkerDto } from "./dto/create-worker.dto";
import { SkipThrottle } from "@nestjs/throttler";

@ApiTags('worker')
@Controller('worker')
@ApiBearerAuth()
export class WorkerController {
  constructor(private readonly workerService: WorkerService) {}

  @SkipThrottle()
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Create a worker' })
  @Post()
  create(@Body() payload: CreateWorkerDto, @Req() req: any) {
    return this.workerService.create(payload, req['user']);
  }

  @SkipThrottle()
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Bulk import/upsert workers' })
  @Post('bulk-import')
  bulkImport(@Body() payload: { workers: CreateWorkerDto[] }, @Req() req: any) {
    return this.workerService.bulkImport(payload, req['user']);
  }

  @UseGuards(AuthGuard, RoleGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.SUPERVISOR)
  @ApiOperation({ summary: 'Get all workers' })
  @Get()
  findAll(
    @Req() req: any,
    @Query('name') name?: string,
    @Query('passport') passport?: string,
    @Query('qr') qr?: string,
    @Query('job') job?: string,
    @Query('brigade') brigade?: string,
    @Query('color') color?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('isActive') isActive?: string,
    @Query('search') search?: string,
    @Query('birthdayDays') birthdayDays?: string,
  ) {
    return this.workerService.findAll(req['user'], { name, passport, qr, job, brigade, color, page, limit, isActive, search, birthdayDays });
  }

  @UseGuards(AuthGuard, RoleGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.SUPERVISOR)
  @ApiOperation({ summary: 'Get active workers with birthdays today' })
  @Get('birthdays/today')
  findBirthdaysToday(@Req() req: any) {
    return this.workerService.findBirthdaysToday(req['user']);
  }

  @UseGuards(AuthGuard, RoleGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.SUPERVISOR)
  @ApiOperation({ summary: 'Get workers by group ID' })
  @Get('by-group/:groupId')
  findByGroup(@Param('groupId', ParseIntPipe) groupId: number, @Req() req: any) {
    return this.workerService.findByGroup(groupId, req['user']);
  }

  @UseGuards(AuthGuard, RoleGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.SUPERVISOR)
  @ApiOperation({ summary: 'Get a single worker by ID' })
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.workerService.findOne(id, req['user']);
  }

  @UseGuards(AuthGuard, RoleGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Update a worker by ID' })
  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() payload: UpdateWorkerDto,
    @Req() req: any,
  ) {
    return this.workerService.update(id, payload, req['user']);
  }

  @UseGuards(AuthGuard, RoleGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Delete a worker by ID' })
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.workerService.remove(id, req['user']);
  }
}

import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Req, UseGuards } from "@nestjs/common";
import { GroupService } from "./group.service";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { AuthGuard } from "src/common/guards/token.guard";
import { RoleGuard } from "src/common/guards/role.guard";
import { Roles } from "src/common/decorators/roles";
import { Role } from "@prisma/client";
import { CreateGroupDto, UpdateGroupDto } from "./dto/create-group.dto";
import { SkipThrottle } from "@nestjs/throttler";

@ApiTags('group')
@Controller("group")
@ApiBearerAuth()
export class GroupController {
  constructor(private readonly groupService: GroupService) {}

  @UseGuards(AuthGuard, RoleGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Create a group' })
  @Post()
  create(@Body() payload: CreateGroupDto, @Req() req: any) {
    return this.groupService.create(payload, req['user']);
  }

  @SkipThrottle()
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Find or create a group by name (used during import)' })
  @Post('find-or-create')
  findOrCreate(@Body() payload: CreateGroupDto, @Req() req: any) {
    return this.groupService.findOrCreate(payload, req['user']);
  }

  @UseGuards(AuthGuard, RoleGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Get all scoped groups' })
  @Get("group/all")
  findAll(@Req() req: any) {
    return this.groupService.findAll(req['user']);
  }

  @UseGuards(AuthGuard, RoleGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.SUPERVISOR)
  @ApiOperation({ summary: 'Get a single group by ID' })
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.groupService.findOne(id, req['user']);
  }

  @UseGuards(AuthGuard, RoleGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Update a group by ID' })
  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() payload: UpdateGroupDto,
    @Req() req: any,
  ) {
    return this.groupService.update(id, payload, req['user']);
  }

  @UseGuards(AuthGuard, RoleGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Delete a group by ID' })
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.groupService.remove(id, req['user']);
  }
}

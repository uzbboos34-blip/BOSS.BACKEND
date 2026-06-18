import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Req, UseGuards } from "@nestjs/common";
import { CheckService } from "./check.service";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { AuthGuard } from "src/common/guards/token.guard";
import { RoleGuard } from "src/common/guards/role.guard";
import { Roles } from "src/common/decorators/roles";
import { Role } from "@prisma/client";
import { CreateCheckDto } from "./dto/create-check.dto";

@ApiTags('check')
@Controller('check')
@ApiBearerAuth()
export class CheckController {
  constructor(private readonly checkService: CheckService) {}

  @UseGuards(AuthGuard, RoleGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Register a check payment for a worker' })
  @Post()
  create(@Body() payload: CreateCheckDto, @Req() req: any) {
    return this.checkService.create(payload, req['user']);
  }

  @UseGuards(AuthGuard, RoleGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.SUPERVISOR)
  @ApiOperation({ summary: 'Get all checks for the branch' })
  @Get()
  findAll(@Req() req: any) {
    return this.checkService.findAll(req['user']);
  }

  @UseGuards(AuthGuard, RoleGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Delete a check payment' })
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.checkService.remove(id, req['user']);
  }
}

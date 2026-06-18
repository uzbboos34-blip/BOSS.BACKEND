import { Body, Controller, Delete, Get, Param, Post, Put, Req, UseGuards } from "@nestjs/common";
import { UserService } from "./user.service";
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation } from "@nestjs/swagger";
import { AuthGuard } from "src/common/guards/token.guard";
import { Roles } from "src/common/decorators/roles";
import { RoleGuard } from "src/common/guards/role.guard";
import { Role } from "@prisma/client";
import { CreateUserDto, UpdateUserDto } from "./dto/create-user-dto";

@Controller("user")
@ApiBearerAuth()
export class UserController {
    constructor(private readonly userService: UserService) { }

    @UseGuards(AuthGuard, RoleGuard)
    @ApiOperation({ summary: `${Role.PLATFORM_SUPER_ADMIN}, ${Role.SUPER_ADMIN}, ${Role.ADMIN} can get all users` })
    @Roles(Role.PLATFORM_SUPER_ADMIN, Role.SUPER_ADMIN, Role.ADMIN)
    @Get("user")
    async findAll(@Req() req: any) {
        return this.userService.findAll(req["user"])
    }


    @UseGuards(AuthGuard, RoleGuard)
    @Roles(Role.PLATFORM_SUPER_ADMIN)
    @ApiOperation({ summary: 'Faqat PLATFORM_SUPER_ADMIN yarata oladi' })
    @Post('create/super-admin')
    createSuperAdmin(
        @Body() payload: CreateUserDto,
        @Req() req: any,
    ) {
        return this.userService.createSuperAdmin(payload, req['user']);
    }

    @UseGuards(AuthGuard, RoleGuard)
    @Roles(Role.SUPER_ADMIN)
    @ApiOperation({ summary: 'Faqat SUPER_ADMIN yarata oladi' })
    @Post('create/admin')
    createAdmin(
        @Body() payload: CreateUserDto,
        @Req() req: any,
    ) {
        return this.userService.createAdmin(payload, req['user']);
    }

    @UseGuards(AuthGuard, RoleGuard)
    @Roles(Role.SUPER_ADMIN, Role.ADMIN)
    @ApiOperation({ summary: 'Faqat SUPER_ADMIN va ADMIN yaratishi mumkin' })
    @Post('create/supervisor')
    createSupervisor(
        @Body() payload: CreateUserDto,
        @Req() req: any,
    ) {
        return this.userService.createSupervisor(payload, req['user']);
    }

    @Get(":id")
    @UseGuards(AuthGuard, RoleGuard)
    @Roles(Role.PLATFORM_SUPER_ADMIN, Role.SUPER_ADMIN, Role.ADMIN, Role.SUPERVISOR)
    @ApiOperation({ summary: 'Faqat PLATFORM_SUPER_ADMIN, SUPER_ADMIN, ADMIN va SUPERVISOR olishi mumkin' })
    getUserById(@Param('id') id: number, @Req() req: any) {
        return this.userService.getUserById(id, req['user']);
    }

    @Put(':id')
    @UseGuards(AuthGuard, RoleGuard)
    @Roles(Role.PLATFORM_SUPER_ADMIN, Role.SUPER_ADMIN, Role.ADMIN, Role.SUPERVISOR)
    @ApiOperation({ summary: 'Faqat PLATFORM_SUPER_ADMIN, SUPER_ADMIN, ADMIN va SUPERVISOR olishi mumkin' })
    updateUser(@Param('id') id: number, @Body() payload: UpdateUserDto, @Req() req: any) {
        return this.userService.updateUser(id, payload, req['user']);
    }

    @Delete(':id')
    @UseGuards(AuthGuard, RoleGuard)
    @Roles(Role.PLATFORM_SUPER_ADMIN, Role.SUPER_ADMIN, Role.ADMIN, Role.SUPERVISOR)
    @ApiOperation({ summary: 'Faqat PLATFORM_SUPER_ADMIN, SUPER_ADMIN, ADMIN  olishi mumkin' })
    deleteUser(@Param('id') id: number, @Req() req: any) {
        return this.userService.deleteUser(id, req['user']);
    }
}
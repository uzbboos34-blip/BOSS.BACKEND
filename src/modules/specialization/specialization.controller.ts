import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Req, UseGuards } from "@nestjs/common";
import { SpecializationService } from "./specialization.service";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { AuthGuard } from "src/common/guards/token.guard";
import { Roles } from "src/common/decorators/roles";
import { RoleGuard } from "src/common/guards/role.guard";
import { Role } from "@prisma/client";
import { CreateSpecializationDto, UpdateSpecializationDto } from "./dto/create-specialization.dto";

@ApiTags('specialization')
@Controller("specialization")
@ApiBearerAuth()
@UseGuards(AuthGuard, RoleGuard)
@Roles(Role.SUPER_ADMIN, Role.ADMIN)
export class SpecializationController {
    constructor(private readonly specializationService: SpecializationService) { }

    @ApiOperation({ summary: 'Create a specialization' })
    @Post()
    create(@Body() payload: CreateSpecializationDto, @Req() req: any) {
        return this.specializationService.create(payload, req['user']);
    }

    @ApiOperation({ summary: 'Find or create a specialization by name (used during import)' })
    @Post('find-or-create')
    findOrCreate(@Body() payload: CreateSpecializationDto, @Req() req: any) {
        return this.specializationService.findOrCreate(payload, req['user']);
    }

    @ApiOperation({ summary: 'Get all scoped specializations' })
    @Get()
    findAll(@Req() req: any) {
        return this.specializationService.findAll(req['user']);
    }

    @ApiOperation({ summary: 'Get a single specialization by ID' })
    @Get(':id')
    findOne(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
        return this.specializationService.findOne(id, req['user']);
    }

    @ApiOperation({ summary: 'Update a specialization by ID' })
    @Put(':id')
    update(
        @Param('id', ParseIntPipe) id: number,
        @Body() payload: UpdateSpecializationDto,
        @Req() req: any,
    ) {
        return this.specializationService.update(id, payload, req['user']);
    }

    @ApiOperation({ summary: 'Delete a specialization by ID' })
    @Delete(':id')
    remove(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
        return this.specializationService.remove(id, req['user']);
    }
}

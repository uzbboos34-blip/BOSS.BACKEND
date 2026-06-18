import { Module } from "@nestjs/common";
import { SpecializationController } from "./specialization.controller";
import { SpecializationService } from "./specialization.service";
import { PrismaModule } from "src/prisma/prisma.module";

@Module({
    imports: [PrismaModule],
    controllers: [SpecializationController],
    providers: [SpecializationService]
})
export class SpecializationModule {}

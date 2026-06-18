import { Module } from '@nestjs/common';
import { CheckService } from './check.service';
import { CheckController } from './check.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { AuditLogModule } from '../audit-log/audit-log.module';

@Module({
  imports: [PrismaModule, AuditLogModule],
  controllers: [CheckController],
  providers: [CheckService],
  exports: [CheckService],
})
export class CheckModule {}

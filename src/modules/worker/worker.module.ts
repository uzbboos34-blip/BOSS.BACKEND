import { Module } from '@nestjs/common';
import { WorkerService } from './worker.service';
import { WorkerController } from './worker.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { AuditLogModule } from '../audit-log/audit-log.module';

@Module({
  imports: [PrismaModule, AuditLogModule],
  controllers: [WorkerController],
  providers: [WorkerService],
  exports: [WorkerService],
})
export class WorkerModule {}

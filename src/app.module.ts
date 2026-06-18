import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { UserModule } from './modules/user/user.module';
import { AuthModule } from './modules/auth/auth.module';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { SpecializationModule } from './modules/specialization/specialization.module';
import { GroupModule } from './modules/group/group.module';
import { AuditLogModule } from './modules/audit-log/audit-log.module';
import { WorkerModule } from './modules/worker/worker.module';
import { CheckModule } from './modules/check/check.module';
import { AttendanceModule } from './modules/attendance/attendance.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true
    }),
    JwtModule.register({
      global: true,
      secret: process.env.JWT_ACCESS_SECRET,
      signOptions: { expiresIn: (process.env.JWT_ACCESS_EXPIRES_IN || '1d') as any },
    }),
    ThrottlerModule.forRoot({
      throttlers: [
        {
          name: 'short',
          ttl: 1000,
          limit: 10,
        },
        {
          name: 'medium',
          ttl: 10000,
          limit: 50,
        },
        {
          name: 'long',
          ttl: 60000,
          limit: 100,
        },
      ],
    }),
    PrismaModule,
    AuthModule,
    UserModule,
    SpecializationModule,
    GroupModule,
    AuditLogModule,
    WorkerModule,
    CheckModule,
    AttendanceModule,
    DashboardModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}


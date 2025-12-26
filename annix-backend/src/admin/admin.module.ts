import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { AdminSession } from './entities/admin-session.entity';
import { User } from '../user/entities/user.entity';
import { UserRole } from '../user-roles/entities/user-role.entity';
import { Rfq } from '../rfq/entities/rfq.entity';
import { RfqItem } from '../rfq/entities/rfq-item.entity';
import { RfqDocument } from '../rfq/entities/rfq-document.entity';

import { AdminAuthService } from './admin-auth.service';
import { AdminAuthController } from './admin-auth.controller';
import { AdminAuthGuard } from './guards/admin-auth.guard';
import { AdminDashboardService } from './admin-dashboard.service';
import { AdminDashboardController } from './admin-dashboard.controller';
import { AdminRfqService } from './admin-rfq.service';
import { AdminRfqController } from './admin-rfq.controller';
import { AdminUserManagementService } from './admin-user-management.service';
import { AdminUserManagementController } from './admin-user-management.controller';

import { AuditModule } from '../audit/audit.module';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AdminSession,
      User,
      UserRole,
      Rfq,
      RfqItem,
      RfqDocument,
    ]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '4h' },
      }),
      inject: [ConfigService],
    }),
    AuditModule,
    EmailModule,
  ],
  providers: [
    AdminAuthService,
    AdminAuthGuard,
    AdminDashboardService,
    AdminRfqService,
    AdminUserManagementService,
  ],
  controllers: [
    AdminAuthController,
    AdminDashboardController,
    AdminRfqController,
    AdminUserManagementController,
  ],
  exports: [AdminAuthService, AdminAuthGuard],
})
export class AdminModule {}

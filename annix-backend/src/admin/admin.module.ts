import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AdminSession } from './entities/admin-session.entity';
import { User } from '../user/entities/user.entity';
import { AdminAuthService } from './admin-auth.service';
import { AdminAuthController } from './admin-auth.controller';
import { AdminDashboardService } from './admin-dashboard.service';
import { AdminDashboardController } from './admin-dashboard.controller';
import { AdminRfqService } from './admin-rfq.service';
import { AdminRfqController } from './admin-rfq.controller';
import { AdminAuthGuard } from './guards/admin-auth.guard';
import { AuditModule } from '../audit/audit.module';
import { CustomerProfile } from '../customer/entities/customer-profile.entity';
import { CustomerOnboarding } from '../customer/entities/customer-onboarding.entity';
import { CustomerSession } from '../customer/entities/customer-session.entity';
import { SupplierProfile } from '../supplier/entities/supplier-profile.entity';
import { SupplierOnboarding } from '../supplier/entities/supplier-onboarding.entity';
import { SupplierSession } from '../supplier/entities/supplier-session.entity';
import { Rfq } from '../rfq/entities/rfq.entity';
import { RfqDraft } from '../rfq/entities/rfq-draft.entity';
import { RfqItem } from '../rfq/entities/rfq-item.entity';
import { RfqDocument } from '../rfq/entities/rfq-document.entity';
import { AuditLog } from '../audit/entities/audit-log.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AdminSession,
      User,
      CustomerProfile,
      CustomerOnboarding,
      CustomerSession,
      SupplierProfile,
      SupplierOnboarding,
      SupplierSession,
      Rfq,
      RfqDraft,
      RfqItem,
      RfqDocument,
      AuditLog,
    ]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '4h' },
      }),
      inject: [ConfigService],
    }),
    AuditModule,
  ],
  providers: [AdminAuthService, AdminAuthGuard, AdminDashboardService, AdminRfqService],
  controllers: [AdminAuthController, AdminDashboardController, AdminRfqController],
  exports: [AdminAuthService, AdminAuthGuard, JwtModule],
})
export class AdminModule {}

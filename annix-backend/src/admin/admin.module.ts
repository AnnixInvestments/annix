import { Module, forwardRef } from '@nestjs/common';
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
import { AdminMessagingController } from './admin-messaging.controller';
import { AdminAuthGuard } from './guards/admin-auth.guard';
import { AuditModule } from '../audit/audit.module';
import { MessagingModule } from '../messaging/messaging.module';
import { RfqModule } from '../rfq/rfq.module';
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
import { AnonymousDraft } from '../rfq/entities/anonymous-draft.entity';
import { AuditLog } from '../audit/entities/audit-log.entity';

@Module({
  imports: [
    forwardRef(() => RfqModule),
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
      AnonymousDraft,
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
    MessagingModule,
  ],
  providers: [
    AdminAuthService,
    AdminAuthGuard,
    AdminDashboardService,
    AdminRfqService,
  ],
  controllers: [
    AdminAuthController,
    AdminDashboardController,
    AdminRfqController,
    AdminMessagingController,
  ],
  exports: [AdminAuthService, AdminAuthGuard, JwtModule],
})
export class AdminModule {}

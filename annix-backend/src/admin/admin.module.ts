import { forwardRef, Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuditModule } from "../audit/audit.module";
import { AuditLog } from "../audit/entities/audit-log.entity";
import { CustomerOnboarding } from "../customer/entities/customer-onboarding.entity";
import { CustomerProfile } from "../customer/entities/customer-profile.entity";
import { CustomerSession } from "../customer/entities/customer-session.entity";
import { MessagingModule } from "../messaging/messaging.module";
import { AnonymousDraft } from "../rfq/entities/anonymous-draft.entity";
import { Rfq } from "../rfq/entities/rfq.entity";
import { RfqDocument } from "../rfq/entities/rfq-document.entity";
import { RfqDraft } from "../rfq/entities/rfq-draft.entity";
import { RfqItem } from "../rfq/entities/rfq-item.entity";
import { RfqModule } from "../rfq/rfq.module";
import { SupplierOnboarding } from "../supplier/entities/supplier-onboarding.entity";
import { SupplierProfile } from "../supplier/entities/supplier-profile.entity";
import { SupplierSession } from "../supplier/entities/supplier-session.entity";
import { User } from "../user/entities/user.entity";
import { AdminAuthController } from "./admin-auth.controller";
import { AdminAuthService } from "./admin-auth.service";
import { AdminDashboardController } from "./admin-dashboard.controller";
import { AdminDashboardService } from "./admin-dashboard.service";
import { AdminMessagingController } from "./admin-messaging.controller";
import { AdminReferenceDataController } from "./admin-reference-data.controller";
import { AdminReferenceDataService } from "./admin-reference-data.service";
import { AdminRfqController } from "./admin-rfq.controller";
import { AdminRfqService } from "./admin-rfq.service";
import { AdminSession } from "./entities/admin-session.entity";
import { AdminAuthGuard } from "./guards/admin-auth.guard";

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
        secret: configService.get<string>("JWT_SECRET"),
        signOptions: { expiresIn: "4h" },
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
    AdminReferenceDataService,
    AdminRfqService,
  ],
  controllers: [
    AdminAuthController,
    AdminDashboardController,
    AdminReferenceDataController,
    AdminRfqController,
    AdminMessagingController,
  ],
  exports: [AdminAuthService, AdminAuthGuard, JwtModule],
})
export class AdminModule {}

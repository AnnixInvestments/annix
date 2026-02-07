import { forwardRef, Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AdminModule } from "../admin/admin.module";
import { AuditModule } from "../audit/audit.module";
import { BoqModule } from "../boq/boq.module";
import { CustomerPreferredSupplier, SupplierInvitation } from "../customer/entities";
import { EmailModule } from "../email/email.module";
import { MessagingModule } from "../messaging/messaging.module";
import { NixModule } from "../nix/nix.module";
import { SecureDocumentsModule } from "../secure-documents/secure-documents.module";
import { StorageModule } from "../storage/storage.module";
import { User } from "../user/entities/user.entity";
// External modules
import { UserModule } from "../user/user.module";
import { UserRole } from "../user-roles/entities/user-role.entity";
// Entities
import {
  SupplierCapability,
  SupplierCompany,
  SupplierDeviceBinding,
  SupplierDocument,
  SupplierLoginAttempt,
  SupplierOnboarding,
  SupplierProfile,
  SupplierSession,
} from "./entities";
// Guards
import { SupplierAuthGuard } from "./guards/supplier-auth.guard";
import { SupplierController } from "./supplier.controller";
import { SupplierService } from "./supplier.service";
import { SupplierAdminController } from "./supplier-admin.controller";
import { SupplierAdminService } from "./supplier-admin.service";
// Controllers
import { SupplierAuthController } from "./supplier-auth.controller";
// Services
import { SupplierAuthService } from "./supplier-auth.service";
import { SupplierBoqController } from "./supplier-boq.controller";
import { SupplierMessagingController } from "./supplier-messaging.controller";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SupplierCompany,
      SupplierProfile,
      SupplierOnboarding,
      SupplierDocument,
      SupplierDeviceBinding,
      SupplierLoginAttempt,
      SupplierSession,
      SupplierCapability,
      User,
      UserRole,
      SupplierInvitation,
      CustomerPreferredSupplier,
    ]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>("JWT_SECRET"),
        signOptions: {
          expiresIn: "1h",
        },
      }),
      inject: [ConfigService],
    }),
    UserModule,
    AuditModule,
    EmailModule,
    forwardRef(() => AdminModule),
    forwardRef(() => BoqModule),
    forwardRef(() => NixModule),
    StorageModule,
    MessagingModule,
    forwardRef(() => SecureDocumentsModule),
  ],
  controllers: [
    SupplierAuthController,
    SupplierController,
    SupplierAdminController,
    SupplierBoqController,
    SupplierMessagingController,
  ],
  providers: [SupplierAuthService, SupplierService, SupplierAdminService, SupplierAuthGuard],
  exports: [
    SupplierAuthService,
    SupplierService,
    SupplierAuthGuard,
    TypeOrmModule, // Export TypeOrmModule for repository access in other modules
  ],
})
export class SupplierModule {}

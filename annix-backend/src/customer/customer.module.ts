import { forwardRef, Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AdminModule } from "../admin/admin.module";
import { AuditModule } from "../audit/audit.module";
import { EmailModule } from "../email/email.module";
import { FeatureFlagsModule } from "../feature-flags/feature-flags.module";
import { MessagingModule } from "../messaging/messaging.module";
import { NixModule } from "../nix/nix.module";
import { Rfq } from "../rfq/entities/rfq.entity";
import { RfqDraft } from "../rfq/entities/rfq-draft.entity";
import { SecureDocumentsModule } from "../secure-documents/secure-documents.module";
import { StorageModule } from "../storage/storage.module";
import { SupplierCapability } from "../supplier/entities/supplier-capability.entity";
import { SupplierCompany } from "../supplier/entities/supplier-company.entity";
import { SupplierProfile } from "../supplier/entities/supplier-profile.entity";
import { User } from "../user/entities/user.entity";
// External modules
import { UserModule } from "../user/user.module";
import { UserRole } from "../user-roles/entities/user-role.entity";
import { CustomerController } from "./customer.controller";
import { CustomerService } from "./customer.service";
import { CustomerAdminController } from "./customer-admin.controller";
import { CustomerAdminService } from "./customer-admin.service";
// Controllers
import { CustomerAuthController } from "./customer-auth.controller";
// Services
import { CustomerAuthService } from "./customer-auth.service";
import { CustomerDocumentController } from "./customer-document.controller";
import { CustomerDocumentService } from "./customer-document.service";
import { CustomerMessagingController } from "./customer-messaging.controller";
import { CustomerOnboardingController } from "./customer-onboarding.controller";
import { CustomerOnboardingService } from "./customer-onboarding.service";
import { CustomerSupplierController } from "./customer-supplier.controller";
import { CustomerSupplierService } from "./customer-supplier.service";
import { DocumentOcrService } from "./document-ocr.service";
// Entities
import {
  CustomerBlockedSupplier,
  CustomerCompany,
  CustomerDeviceBinding,
  CustomerDocument,
  CustomerLoginAttempt,
  CustomerOnboarding,
  CustomerPreferredSupplier,
  CustomerProfile,
  CustomerSession,
  SupplierInvitation,
} from "./entities";
// Guards
import { CustomerAuthGuard } from "./guards/customer-auth.guard";
import { CertificateExpiryService } from "./services/certificate-expiry.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CustomerCompany,
      CustomerProfile,
      CustomerDeviceBinding,
      CustomerLoginAttempt,
      CustomerSession,
      CustomerOnboarding,
      CustomerDocument,
      CustomerPreferredSupplier,
      CustomerBlockedSupplier,
      SupplierInvitation,
      SupplierProfile,
      SupplierCompany,
      SupplierCapability,
      User,
      UserRole,
      Rfq,
      RfqDraft,
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
    StorageModule,
    forwardRef(() => AdminModule),
    forwardRef(() => NixModule),
    MessagingModule,
    forwardRef(() => SecureDocumentsModule),
    FeatureFlagsModule,
  ],
  controllers: [
    CustomerAuthController,
    CustomerController,
    CustomerAdminController,
    CustomerOnboardingController,
    CustomerDocumentController,
    CustomerSupplierController,
    CustomerMessagingController,
  ],
  providers: [
    CustomerAuthService,
    CustomerService,
    CustomerAdminService,
    CustomerOnboardingService,
    CustomerDocumentService,
    CustomerSupplierService,
    DocumentOcrService,
    CertificateExpiryService,
    CustomerAuthGuard,
  ],
  exports: [
    CustomerAuthService,
    CustomerService,
    CustomerOnboardingService,
    CustomerSupplierService,
    CustomerAuthGuard,
    JwtModule,
  ],
})
export class CustomerModule {}

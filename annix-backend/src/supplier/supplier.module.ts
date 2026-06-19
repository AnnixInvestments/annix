import { forwardRef, Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { MongooseModule } from "@nestjs/mongoose";
import { AdminModule } from "../admin/admin.module";
import { AuditModule } from "../audit/audit.module";
import { BoqModule } from "../boq/boq.module";
import { CustomerPreferredSupplierRepository } from "../customer/customer-preferred-supplier.repository";
import { MongoCustomerPreferredSupplierRepository } from "../customer/customer-preferred-supplier.repository.mongo";
import { CustomerPreferredSupplierSchema } from "../customer/schemas/customer-preferred-supplier.schema";
import { SupplierInvitationSchema } from "../customer/schemas/supplier-invitation.schema";
import { SupplierInvitationRepository } from "../customer/supplier-invitation.repository";
import { MongoSupplierInvitationRepository } from "../customer/supplier-invitation.repository.mongo";
import { EmailModule } from "../email/email.module";
import { FeatureFlagsModule } from "../feature-flags/feature-flags.module";
import { repositoryProvider } from "../lib/persistence/repository-provider";
import { MessagingModule } from "../messaging/messaging.module";
import { NixModule } from "../nix/nix.module";
import { CompanyRepository } from "../platform/company.repository";
import { MongoCompanyRepository } from "../platform/company.repository.mongo";
import { CompanySchema } from "../platform/schemas/company.schema";
import { RfqRepository } from "../rfq/rfq.repository";
import { MongoRfqRepository } from "../rfq/rfq.repository.mongo";
import { RfqSchema } from "../rfq/schemas/rfq.schema";
import { SecureDocumentsModule } from "../secure-documents/secure-documents.module";
import { StorageModule } from "../storage/storage.module";
import { UserSchema } from "../user/schemas/user.schema";
// External modules
import { UserModule } from "../user/user.module";
import { UserRepository } from "../user/user.repository";
import { MongoUserRepository } from "../user/user.repository.mongo";
import { UserRoleSchema } from "../user-roles/schemas/user-role.schema";
import { UserRoleRepository } from "../user-roles/user-roles.repository";
import { MongoUserRoleRepository } from "../user-roles/user-roles.repository.mongo";
import { SupplierCapabilities } from "./capabilities/supplier.capabilities";
// Guards
import { SupplierAuthGuard } from "./guards/supplier-auth.guard";
// Schemas
import { SupplierCapabilitySchema } from "./schemas/supplier-capability.schema";
import { SupplierDeviceBindingSchema } from "./schemas/supplier-device-binding.schema";
import { SupplierDocumentSchema } from "./schemas/supplier-document.schema";
import { SupplierLoginAttemptSchema } from "./schemas/supplier-login-attempt.schema";
import { SupplierOnboardingSchema } from "./schemas/supplier-onboarding.schema";
import { SupplierProfileSchema } from "./schemas/supplier-profile.schema";
import { SupplierSessionSchema } from "./schemas/supplier-session.schema";
import { SupplierController } from "./supplier.controller";
import { SupplierService } from "./supplier.service";
import { SupplierAdminController } from "./supplier-admin.controller";
import { SupplierAdminService } from "./supplier-admin.service";
// Controllers
import { SupplierAuthController } from "./supplier-auth.controller";
// Services
import { SupplierAuthService } from "./supplier-auth.service";
import { SupplierBoqController } from "./supplier-boq.controller";
// Repositories
import { SupplierCapabilityRepository } from "./supplier-capability.repository";
import { MongoSupplierCapabilityRepository } from "./supplier-capability.repository.mongo";
import { SupplierDeviceBindingRepository } from "./supplier-device-binding.repository";
import { MongoSupplierDeviceBindingRepository } from "./supplier-device-binding.repository.mongo";
import { SupplierDocumentRepository } from "./supplier-document.repository";
import { MongoSupplierDocumentRepository } from "./supplier-document.repository.mongo";
import { SupplierLoginAttemptRepository } from "./supplier-login-attempt.repository";
import { MongoSupplierLoginAttemptRepository } from "./supplier-login-attempt.repository.mongo";
import { SupplierMessagingController } from "./supplier-messaging.controller";
import { SupplierOnboardingRepository } from "./supplier-onboarding.repository";
import { MongoSupplierOnboardingRepository } from "./supplier-onboarding.repository.mongo";
import { SupplierProfileRepository } from "./supplier-profile.repository";
import { MongoSupplierProfileRepository } from "./supplier-profile.repository.mongo";
import { SupplierPumpQuoteController } from "./supplier-pump-quote.controller";
import { SupplierSessionRepository } from "./supplier-session.repository";
import { MongoSupplierSessionRepository } from "./supplier-session.repository.mongo";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: "SupplierProfile", schema: SupplierProfileSchema },
      { name: "SupplierOnboarding", schema: SupplierOnboardingSchema },
      { name: "SupplierDocument", schema: SupplierDocumentSchema },
      { name: "SupplierDeviceBinding", schema: SupplierDeviceBindingSchema },
      { name: "SupplierLoginAttempt", schema: SupplierLoginAttemptSchema },
      { name: "SupplierSession", schema: SupplierSessionSchema },
      { name: "SupplierCapability", schema: SupplierCapabilitySchema },
      { name: "SupplierInvitation", schema: SupplierInvitationSchema },
      { name: "CustomerPreferredSupplier", schema: CustomerPreferredSupplierSchema },
      { name: "User", schema: UserSchema },
      { name: "Rfq", schema: RfqSchema },
      { name: "Company", schema: CompanySchema },
      { name: "UserRole", schema: UserRoleSchema },
    ]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>("JWT_SECRET"),
        signOptions: {
          expiresIn: "8h",
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
    FeatureFlagsModule,
  ],
  controllers: [
    SupplierAuthController,
    SupplierController,
    SupplierAdminController,
    SupplierBoqController,
    SupplierMessagingController,
    SupplierPumpQuoteController,
  ],
  providers: [
    SupplierAuthService,
    SupplierService,
    SupplierAdminService,
    SupplierAuthGuard,
    SupplierCapabilities,
    repositoryProvider(SupplierProfileRepository, MongoSupplierProfileRepository),
    repositoryProvider(SupplierOnboardingRepository, MongoSupplierOnboardingRepository),
    repositoryProvider(SupplierDocumentRepository, MongoSupplierDocumentRepository),
    repositoryProvider(SupplierDeviceBindingRepository, MongoSupplierDeviceBindingRepository),
    repositoryProvider(SupplierLoginAttemptRepository, MongoSupplierLoginAttemptRepository),
    repositoryProvider(SupplierSessionRepository, MongoSupplierSessionRepository),
    repositoryProvider(SupplierCapabilityRepository, MongoSupplierCapabilityRepository),
    repositoryProvider(SupplierInvitationRepository, MongoSupplierInvitationRepository),
    repositoryProvider(
      CustomerPreferredSupplierRepository,
      MongoCustomerPreferredSupplierRepository,
    ),
    repositoryProvider(RfqRepository, MongoRfqRepository),
    repositoryProvider(CompanyRepository, MongoCompanyRepository),
    repositoryProvider(UserRepository, MongoUserRepository),
    repositoryProvider(UserRoleRepository, MongoUserRoleRepository),
  ],
  exports: [SupplierAuthService, SupplierService, SupplierAuthGuard],
})
export class SupplierModule {}

import { forwardRef, Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { MongooseModule } from "@nestjs/mongoose";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AdminModule } from "../admin/admin.module";
import { AuditModule } from "../audit/audit.module";
import { BoqModule } from "../boq/boq.module";
import { CustomerPreferredSupplierRepository } from "../customer/customer-preferred-supplier.repository";
import { MongoCustomerPreferredSupplierRepository } from "../customer/customer-preferred-supplier.repository.mongo";
import { PostgresCustomerPreferredSupplierRepository } from "../customer/customer-preferred-supplier.repository.postgres";
import { CustomerPreferredSupplier, SupplierInvitation } from "../customer/entities";
import { CustomerPreferredSupplierSchema } from "../customer/schemas/customer-preferred-supplier.schema";
import { SupplierInvitationSchema } from "../customer/schemas/supplier-invitation.schema";
import { SupplierInvitationRepository } from "../customer/supplier-invitation.repository";
import { MongoSupplierInvitationRepository } from "../customer/supplier-invitation.repository.mongo";
import { PostgresSupplierInvitationRepository } from "../customer/supplier-invitation.repository.postgres";
import { EmailModule } from "../email/email.module";
import { FeatureFlagsModule } from "../feature-flags/feature-flags.module";
import { isMongoDriver } from "../lib/persistence/database-driver";
import { repositoryProvider } from "../lib/persistence/repository-provider";
import { MessagingModule } from "../messaging/messaging.module";
import { NixModule } from "../nix/nix.module";
import { CompanyRepository } from "../platform/company.repository";
import { MongoCompanyRepository } from "../platform/company.repository.mongo";
import { PostgresCompanyRepository } from "../platform/company.repository.postgres";
import { Company } from "../platform/entities/company.entity";
import { CompanySchema } from "../platform/schemas/company.schema";
import { PumpRfq } from "../rfq/entities/pump-rfq.entity";
import { Rfq } from "../rfq/entities/rfq.entity";
import { RfqItem } from "../rfq/entities/rfq-item.entity";
import { RfqRepository } from "../rfq/rfq.repository";
import { MongoRfqRepository } from "../rfq/rfq.repository.mongo";
import { PostgresRfqRepository } from "../rfq/rfq.repository.postgres";
import { RfqSchema } from "../rfq/schemas/rfq.schema";
import { SecureDocumentsModule } from "../secure-documents/secure-documents.module";
import { StorageModule } from "../storage/storage.module";
import { User } from "../user/entities/user.entity";
import { UserSchema } from "../user/schemas/user.schema";
// External modules
import { UserModule } from "../user/user.module";
import { UserRepository } from "../user/user.repository";
import { MongoUserRepository } from "../user/user.repository.mongo";
import { PostgresUserRepository } from "../user/user.repository.postgres";
import { UserRole } from "../user-roles/entities/user-role.entity";
import { UserRoleSchema } from "../user-roles/schemas/user-role.schema";
import { UserRoleRepository } from "../user-roles/user-roles.repository";
import { MongoUserRoleRepository } from "../user-roles/user-roles.repository.mongo";
import { PostgresUserRoleRepository } from "../user-roles/user-roles.repository.postgres";
import { SupplierCapabilities } from "./capabilities/supplier.capabilities";
// Entities
import {
  SupplierCapability,
  SupplierDeviceBinding,
  SupplierDocument,
  SupplierLoginAttempt,
  SupplierOnboarding,
  SupplierProfile,
  SupplierSession,
} from "./entities";
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
import { PostgresSupplierCapabilityRepository } from "./supplier-capability.repository.postgres";
import { SupplierDeviceBindingRepository } from "./supplier-device-binding.repository";
import { MongoSupplierDeviceBindingRepository } from "./supplier-device-binding.repository.mongo";
import { PostgresSupplierDeviceBindingRepository } from "./supplier-device-binding.repository.postgres";
import { SupplierDocumentRepository } from "./supplier-document.repository";
import { MongoSupplierDocumentRepository } from "./supplier-document.repository.mongo";
import { PostgresSupplierDocumentRepository } from "./supplier-document.repository.postgres";
import { SupplierLoginAttemptRepository } from "./supplier-login-attempt.repository";
import { MongoSupplierLoginAttemptRepository } from "./supplier-login-attempt.repository.mongo";
import { PostgresSupplierLoginAttemptRepository } from "./supplier-login-attempt.repository.postgres";
import { SupplierMessagingController } from "./supplier-messaging.controller";
import { SupplierOnboardingRepository } from "./supplier-onboarding.repository";
import { MongoSupplierOnboardingRepository } from "./supplier-onboarding.repository.mongo";
import { PostgresSupplierOnboardingRepository } from "./supplier-onboarding.repository.postgres";
import { SupplierProfileRepository } from "./supplier-profile.repository";
import { MongoSupplierProfileRepository } from "./supplier-profile.repository.mongo";
import { PostgresSupplierProfileRepository } from "./supplier-profile.repository.postgres";
import { SupplierPumpQuoteController } from "./supplier-pump-quote.controller";
import { SupplierSessionRepository } from "./supplier-session.repository";
import { MongoSupplierSessionRepository } from "./supplier-session.repository.mongo";
import { PostgresSupplierSessionRepository } from "./supplier-session.repository.postgres";

@Module({
  imports: [
    ...(isMongoDriver()
      ? [
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
        ]
      : []),
    ...(isMongoDriver()
      ? []
      : [
          TypeOrmModule.forFeature([
            Company,
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
            Rfq,
            RfqItem,
            PumpRfq,
          ]),
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
    repositoryProvider(
      SupplierProfileRepository,
      PostgresSupplierProfileRepository,
      MongoSupplierProfileRepository,
    ),
    repositoryProvider(
      SupplierOnboardingRepository,
      PostgresSupplierOnboardingRepository,
      MongoSupplierOnboardingRepository,
    ),
    repositoryProvider(
      SupplierDocumentRepository,
      PostgresSupplierDocumentRepository,
      MongoSupplierDocumentRepository,
    ),
    repositoryProvider(
      SupplierDeviceBindingRepository,
      PostgresSupplierDeviceBindingRepository,
      MongoSupplierDeviceBindingRepository,
    ),
    repositoryProvider(
      SupplierLoginAttemptRepository,
      PostgresSupplierLoginAttemptRepository,
      MongoSupplierLoginAttemptRepository,
    ),
    repositoryProvider(
      SupplierSessionRepository,
      PostgresSupplierSessionRepository,
      MongoSupplierSessionRepository,
    ),
    repositoryProvider(
      SupplierCapabilityRepository,
      PostgresSupplierCapabilityRepository,
      MongoSupplierCapabilityRepository,
    ),
    repositoryProvider(
      SupplierInvitationRepository,
      PostgresSupplierInvitationRepository,
      MongoSupplierInvitationRepository,
    ),
    repositoryProvider(
      CustomerPreferredSupplierRepository,
      PostgresCustomerPreferredSupplierRepository,
      MongoCustomerPreferredSupplierRepository,
    ),
    repositoryProvider(RfqRepository, PostgresRfqRepository, MongoRfqRepository),
    repositoryProvider(CompanyRepository, PostgresCompanyRepository, MongoCompanyRepository),
    repositoryProvider(UserRepository, PostgresUserRepository, MongoUserRepository),
    repositoryProvider(UserRoleRepository, PostgresUserRoleRepository, MongoUserRoleRepository),
  ],
  exports: [
    SupplierAuthService,
    SupplierService,
    SupplierAuthGuard,
    ...(isMongoDriver() ? [] : [TypeOrmModule]),
  ],
})
export class SupplierModule {}

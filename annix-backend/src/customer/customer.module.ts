import { forwardRef, Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { MongooseModule } from "@nestjs/mongoose";
import { AdminModule } from "../admin/admin.module";
import { AuditModule } from "../audit/audit.module";
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
import { RfqDraftRepository } from "../rfq/rfq-draft.repository";
import { MongoRfqDraftRepository } from "../rfq/rfq-draft.repository.mongo";
import { RfqSchema } from "../rfq/schemas/rfq.schema";
import { RfqDraftSchema } from "../rfq/schemas/rfq-draft.schema";
import { SecureDocumentsModule } from "../secure-documents/secure-documents.module";
import { StorageModule } from "../storage/storage.module";
import { SupplierOnboardingSchema } from "../supplier/schemas/supplier-onboarding.schema";
import { SupplierProfileSchema } from "../supplier/schemas/supplier-profile.schema";
import { SupplierProfileRepository } from "../supplier/supplier-profile.repository";
import { MongoSupplierProfileRepository } from "../supplier/supplier-profile.repository.mongo";
import { UserSchema } from "../user/schemas/user.schema";
// External modules
import { UserModule } from "../user/user.module";
import { UserRepository } from "../user/user.repository";
import { MongoUserRepository } from "../user/user.repository.mongo";
import { UserRoleSchema } from "../user-roles/schemas/user-role.schema";
import { UserRoleRepository } from "../user-roles/user-roles.repository";
import { MongoUserRoleRepository } from "../user-roles/user-roles.repository.mongo";
import { CustomerCapabilities } from "./capabilities/customer.capabilities";
import { CustomerController } from "./customer.controller";
import { CustomerService } from "./customer.service";
import { CustomerAdminController } from "./customer-admin.controller";
import { CustomerAdminService } from "./customer-admin.service";
// Controllers
import { CustomerAuthController } from "./customer-auth.controller";
// Services
import { CustomerAuthService } from "./customer-auth.service";
import { CustomerBlockedSupplierRepository } from "./customer-blocked-supplier.repository";
import { MongoCustomerBlockedSupplierRepository } from "./customer-blocked-supplier.repository.mongo";
import { CustomerDeviceBindingRepository } from "./customer-device-binding.repository";
import { MongoCustomerDeviceBindingRepository } from "./customer-device-binding.repository.mongo";
import { CustomerDocumentController } from "./customer-document.controller";
import { CustomerDocumentRepository } from "./customer-document.repository";
import { MongoCustomerDocumentRepository } from "./customer-document.repository.mongo";
import { CustomerDocumentService } from "./customer-document.service";
import { CustomerLoginAttemptRepository } from "./customer-login-attempt.repository";
import { MongoCustomerLoginAttemptRepository } from "./customer-login-attempt.repository.mongo";
import { CustomerMessagingController } from "./customer-messaging.controller";
import { CustomerOnboardingController } from "./customer-onboarding.controller";
import { CustomerOnboardingRepository } from "./customer-onboarding.repository";
import { MongoCustomerOnboardingRepository } from "./customer-onboarding.repository.mongo";
import { CustomerOnboardingService } from "./customer-onboarding.service";
import { CustomerPreferredSupplierRepository } from "./customer-preferred-supplier.repository";
import { MongoCustomerPreferredSupplierRepository } from "./customer-preferred-supplier.repository.mongo";
import { CustomerProfileRepository } from "./customer-profile.repository";
import { MongoCustomerProfileRepository } from "./customer-profile.repository.mongo";
import { CustomerSessionRepository } from "./customer-session.repository";
import { MongoCustomerSessionRepository } from "./customer-session.repository.mongo";
import { CustomerSupplierController } from "./customer-supplier.controller";
import { CustomerSupplierService } from "./customer-supplier.service";
import { DocumentOcrService } from "./document-ocr.service";
// Guards
import { CustomerAuthGuard } from "./guards/customer-auth.guard";
// Schemas
import { CustomerBlockedSupplierSchema } from "./schemas/customer-blocked-supplier.schema";
import { CustomerDeviceBindingSchema } from "./schemas/customer-device-binding.schema";
import { CustomerDocumentSchema } from "./schemas/customer-document.schema";
import { CustomerLoginAttemptSchema } from "./schemas/customer-login-attempt.schema";
import { CustomerOnboardingSchema } from "./schemas/customer-onboarding.schema";
import { CustomerPreferredSupplierSchema } from "./schemas/customer-preferred-supplier.schema";
import { CustomerProfileSchema } from "./schemas/customer-profile.schema";
import { CustomerSessionSchema } from "./schemas/customer-session.schema";
import { SupplierInvitationSchema } from "./schemas/supplier-invitation.schema";
import { CertificateExpiryService } from "./services/certificate-expiry.service";
import { SupplierInvitationRepository } from "./supplier-invitation.repository";
import { MongoSupplierInvitationRepository } from "./supplier-invitation.repository.mongo";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: "CustomerProfile", schema: CustomerProfileSchema },
      { name: "CustomerOnboarding", schema: CustomerOnboardingSchema },
      { name: "CustomerDocument", schema: CustomerDocumentSchema },
      { name: "CustomerSession", schema: CustomerSessionSchema },
      { name: "CustomerLoginAttempt", schema: CustomerLoginAttemptSchema },
      { name: "CustomerDeviceBinding", schema: CustomerDeviceBindingSchema },
      { name: "CustomerPreferredSupplier", schema: CustomerPreferredSupplierSchema },
      { name: "CustomerBlockedSupplier", schema: CustomerBlockedSupplierSchema },
      { name: "SupplierInvitation", schema: SupplierInvitationSchema },
      { name: "Company", schema: CompanySchema },
      { name: "User", schema: UserSchema },
      { name: "UserRole", schema: UserRoleSchema },
      { name: "Rfq", schema: RfqSchema },
      { name: "RfqDraft", schema: RfqDraftSchema },
      { name: "SupplierProfile", schema: SupplierProfileSchema },
      { name: "SupplierOnboarding", schema: SupplierOnboardingSchema },
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
    CustomerCapabilities,
    repositoryProvider(CustomerProfileRepository, MongoCustomerProfileRepository),
    repositoryProvider(CustomerOnboardingRepository, MongoCustomerOnboardingRepository),
    repositoryProvider(CustomerDocumentRepository, MongoCustomerDocumentRepository),
    repositoryProvider(CustomerSessionRepository, MongoCustomerSessionRepository),
    repositoryProvider(CustomerLoginAttemptRepository, MongoCustomerLoginAttemptRepository),
    repositoryProvider(CustomerDeviceBindingRepository, MongoCustomerDeviceBindingRepository),
    repositoryProvider(
      CustomerPreferredSupplierRepository,
      MongoCustomerPreferredSupplierRepository,
    ),
    repositoryProvider(CustomerBlockedSupplierRepository, MongoCustomerBlockedSupplierRepository),
    repositoryProvider(SupplierInvitationRepository, MongoSupplierInvitationRepository),
    repositoryProvider(CompanyRepository, MongoCompanyRepository),
    repositoryProvider(UserRepository, MongoUserRepository),
    repositoryProvider(UserRoleRepository, MongoUserRoleRepository),
    repositoryProvider(RfqRepository, MongoRfqRepository),
    repositoryProvider(RfqDraftRepository, MongoRfqDraftRepository),
    repositoryProvider(SupplierProfileRepository, MongoSupplierProfileRepository),
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

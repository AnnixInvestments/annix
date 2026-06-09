import { forwardRef, Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { MongooseModule } from "@nestjs/mongoose";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuditModule } from "../audit/audit.module";
import { AuditLogRepository } from "../audit/audit.repository";
import { MongoAuditLogRepository } from "../audit/audit.repository.mongo";
import { PostgresAuditLogRepository } from "../audit/audit.repository.postgres";
import { AuditLog } from "../audit/entities/audit-log.entity";
import { AuditLogSchema } from "../audit/schemas/audit-log.schema";
import { CustomerOnboardingRepository } from "../customer/customer-onboarding.repository";
import { MongoCustomerOnboardingRepository } from "../customer/customer-onboarding.repository.mongo";
import { PostgresCustomerOnboardingRepository } from "../customer/customer-onboarding.repository.postgres";
import { CustomerProfileRepository } from "../customer/customer-profile.repository";
import { MongoCustomerProfileRepository } from "../customer/customer-profile.repository.mongo";
import { PostgresCustomerProfileRepository } from "../customer/customer-profile.repository.postgres";
import { CustomerSessionRepository } from "../customer/customer-session.repository";
import { MongoCustomerSessionRepository } from "../customer/customer-session.repository.mongo";
import { PostgresCustomerSessionRepository } from "../customer/customer-session.repository.postgres";
import { CustomerOnboarding } from "../customer/entities/customer-onboarding.entity";
import { CustomerProfile } from "../customer/entities/customer-profile.entity";
import { CustomerSession } from "../customer/entities/customer-session.entity";
import { CustomerOnboardingSchema } from "../customer/schemas/customer-onboarding.schema";
import { CustomerProfileSchema } from "../customer/schemas/customer-profile.schema";
import { CustomerSessionSchema } from "../customer/schemas/customer-session.schema";
import { FeedbackModule } from "../feedback/feedback.module";
import { isMongoDriver } from "../lib/persistence/database-driver";
import { repositoryProvider } from "../lib/persistence/repository-provider";
import { MessagingModule } from "../messaging/messaging.module";
import { PlatformMetricsModule } from "../platform-metrics/platform-metrics.module";
import { App } from "../rbac/entities/app.entity";
import { AppPermission } from "../rbac/entities/app-permission.entity";
import { AppRole } from "../rbac/entities/app-role.entity";
import { AppRolePermission } from "../rbac/entities/app-role-permission.entity";
import { AppRoleProduct } from "../rbac/entities/app-role-product.entity";
import { UserAccessProduct } from "../rbac/entities/user-access-product.entity";
import { UserAppAccess } from "../rbac/entities/user-app-access.entity";
import { UserAppPermission } from "../rbac/entities/user-app-permission.entity";
import { AppRepository, AppRoleRepository, UserAppAccessRepository } from "../rbac/rbac.repository";
import {
  MongoAppRepository,
  MongoAppRoleRepository,
  MongoUserAppAccessRepository,
} from "../rbac/rbac.repository.mongo";
import {
  PostgresAppRepository,
  PostgresAppRoleRepository,
  PostgresUserAppAccessRepository,
} from "../rbac/rbac.repository.postgres";
import { AppSchema } from "../rbac/schemas/app.schema";
import { AppRoleSchema } from "../rbac/schemas/app-role.schema";
import { UserAppAccessSchema } from "../rbac/schemas/user-app-access.schema";
import { AnonymousDraftRepository } from "../rfq/anonymous-draft.repository";
import { MongoAnonymousDraftRepository } from "../rfq/anonymous-draft.repository.mongo";
import { PostgresAnonymousDraftRepository } from "../rfq/anonymous-draft.repository.postgres";
import { AnonymousDraft } from "../rfq/entities/anonymous-draft.entity";
import { Rfq } from "../rfq/entities/rfq.entity";
import { RfqDocument } from "../rfq/entities/rfq-document.entity";
import { RfqDraft } from "../rfq/entities/rfq-draft.entity";
import { RfqItem } from "../rfq/entities/rfq-item.entity";
import { RfqModule } from "../rfq/rfq.module";
import { RfqRepository } from "../rfq/rfq.repository";
import { MongoRfqRepository } from "../rfq/rfq.repository.mongo";
import { PostgresRfqRepository } from "../rfq/rfq.repository.postgres";
import { RfqDocumentRepository } from "../rfq/rfq-document.repository";
import { MongoRfqDocumentRepository } from "../rfq/rfq-document.repository.mongo";
import { PostgresRfqDocumentRepository } from "../rfq/rfq-document.repository.postgres";
import { RfqDraftRepository } from "../rfq/rfq-draft.repository";
import { MongoRfqDraftRepository } from "../rfq/rfq-draft.repository.mongo";
import { PostgresRfqDraftRepository } from "../rfq/rfq-draft.repository.postgres";
import { AnonymousDraftSchema } from "../rfq/schemas/anonymous-draft.schema";
import { RfqSchema } from "../rfq/schemas/rfq.schema";
import { RfqDocumentSchema } from "../rfq/schemas/rfq-document.schema";
import { RfqDraftSchema } from "../rfq/schemas/rfq-draft.schema";
import { SupplierOnboarding } from "../supplier/entities/supplier-onboarding.entity";
import { SupplierProfile } from "../supplier/entities/supplier-profile.entity";
import { SupplierSession } from "../supplier/entities/supplier-session.entity";
import { SupplierOnboardingSchema } from "../supplier/schemas/supplier-onboarding.schema";
import { SupplierProfileSchema } from "../supplier/schemas/supplier-profile.schema";
import { SupplierSessionSchema } from "../supplier/schemas/supplier-session.schema";
import { SupplierOnboardingRepository } from "../supplier/supplier-onboarding.repository";
import { MongoSupplierOnboardingRepository } from "../supplier/supplier-onboarding.repository.mongo";
import { PostgresSupplierOnboardingRepository } from "../supplier/supplier-onboarding.repository.postgres";
import { SupplierProfileRepository } from "../supplier/supplier-profile.repository";
import { MongoSupplierProfileRepository } from "../supplier/supplier-profile.repository.mongo";
import { PostgresSupplierProfileRepository } from "../supplier/supplier-profile.repository.postgres";
import { SupplierSessionRepository } from "../supplier/supplier-session.repository";
import { MongoSupplierSessionRepository } from "../supplier/supplier-session.repository.mongo";
import { PostgresSupplierSessionRepository } from "../supplier/supplier-session.repository.postgres";
import { User } from "../user/entities/user.entity";
import { UserSchema } from "../user/schemas/user.schema";
import { UserRepository } from "../user/user.repository";
import { MongoUserRepository } from "../user/user.repository.mongo";
import { PostgresUserRepository } from "../user/user.repository.postgres";
import { UserRole } from "../user-roles/entities/user-role.entity";
import { UserRoleSchema } from "../user-roles/schemas/user-role.schema";
import { UserRoleRepository } from "../user-roles/user-roles.repository";
import { MongoUserRoleRepository } from "../user-roles/user-roles.repository.mongo";
import { PostgresUserRoleRepository } from "../user-roles/user-roles.repository.postgres";
import { AdminAiUsageController } from "./admin-ai-usage.controller";
import { AdminAuthController } from "./admin-auth.controller";
import { AdminAuthService } from "./admin-auth.service";
import { AdminCompanyProfileController } from "./admin-company-profile.controller";
import { AdminCompanyProfileService } from "./admin-company-profile.service";
import { AdminDashboardController } from "./admin-dashboard.controller";
import { AdminDashboardService } from "./admin-dashboard.service";
import { AdminFeedbackController } from "./admin-feedback.controller";
import { AdminMessagingController } from "./admin-messaging.controller";
import { AdminPlatformLimitsController } from "./admin-platform-limits.controller";
import { AdminPlatformLimitsService } from "./admin-platform-limits.service";
import {
  AdminPollingJobsController,
  PublicPollingJobsController,
} from "./admin-polling-jobs.controller";
import { AdminPollingJobsService } from "./admin-polling-jobs.service";
import { AdminReferenceDataController } from "./admin-reference-data.controller";
import { AdminReferenceDataService } from "./admin-reference-data.service";
import { AdminRfqController } from "./admin-rfq.controller";
import { AdminRfqService } from "./admin-rfq.service";
import { AdminScheduledJobsController } from "./admin-scheduled-jobs.controller";
import { AdminScheduledJobsService } from "./admin-scheduled-jobs.service";
import { AdminSession } from "./entities/admin-session.entity";
import { CompanyProfile } from "./entities/company-profile.entity";
import { PollingJobOverride } from "./entities/polling-job-override.entity";
import { PollingJobsGlobalSettings } from "./entities/polling-jobs-global-settings.entity";
import { ScheduledJobOverride } from "./entities/scheduled-job-override.entity";
import { ScheduledJobsGlobalSettings } from "./entities/scheduled-jobs-global-settings.entity";
import { AdminAuthGuard } from "./guards/admin-auth.guard";
import { PublicCompanyProfileController } from "./public-company-profile.controller";
import { AdminSessionRepository } from "./repositories/admin-session.repository";
import { MongoAdminSessionRepository } from "./repositories/admin-session.repository.mongo";
import { PostgresAdminSessionRepository } from "./repositories/admin-session.repository.postgres";
import { CompanyProfileRepository } from "./repositories/company-profile.repository";
import { MongoCompanyProfileRepository } from "./repositories/company-profile.repository.mongo";
import { PostgresCompanyProfileRepository } from "./repositories/company-profile.repository.postgres";
import { PollingJobOverrideRepository } from "./repositories/polling-job-override.repository";
import { MongoPollingJobOverrideRepository } from "./repositories/polling-job-override.repository.mongo";
import { PostgresPollingJobOverrideRepository } from "./repositories/polling-job-override.repository.postgres";
import { PollingJobsGlobalSettingsRepository } from "./repositories/polling-jobs-global-settings.repository";
import { MongoPollingJobsGlobalSettingsRepository } from "./repositories/polling-jobs-global-settings.repository.mongo";
import { PostgresPollingJobsGlobalSettingsRepository } from "./repositories/polling-jobs-global-settings.repository.postgres";
import { ScheduledJobOverrideRepository } from "./repositories/scheduled-job-override.repository";
import { MongoScheduledJobOverrideRepository } from "./repositories/scheduled-job-override.repository.mongo";
import { PostgresScheduledJobOverrideRepository } from "./repositories/scheduled-job-override.repository.postgres";
import { ScheduledJobsGlobalSettingsRepository } from "./repositories/scheduled-jobs-global-settings.repository";
import { MongoScheduledJobsGlobalSettingsRepository } from "./repositories/scheduled-jobs-global-settings.repository.mongo";
import { PostgresScheduledJobsGlobalSettingsRepository } from "./repositories/scheduled-jobs-global-settings.repository.postgres";
import { AdminSessionSchema } from "./schemas/admin-session.schema";
import { CompanyProfileSchema } from "./schemas/company-profile.schema";
import { PollingJobOverrideSchema } from "./schemas/polling-job-override.schema";
import { PollingJobsGlobalSettingsSchema } from "./schemas/polling-jobs-global-settings.schema";
import { ScheduledJobOverrideSchema } from "./schemas/scheduled-job-override.schema";
import { ScheduledJobsGlobalSettingsSchema } from "./schemas/scheduled-jobs-global-settings.schema";

@Module({
  imports: [
    ConfigModule,
    forwardRef(() => RfqModule),
    ...(isMongoDriver()
      ? [
          MongooseModule.forFeature([
            { name: "AdminSession", schema: AdminSessionSchema },
            { name: "CompanyProfile", schema: CompanyProfileSchema },
            { name: "ScheduledJobOverride", schema: ScheduledJobOverrideSchema },
            { name: "ScheduledJobsGlobalSettings", schema: ScheduledJobsGlobalSettingsSchema },
            { name: "PollingJobOverride", schema: PollingJobOverrideSchema },
            { name: "PollingJobsGlobalSettings", schema: PollingJobsGlobalSettingsSchema },
            { name: "User", schema: UserSchema },
            { name: "UserRole", schema: UserRoleSchema },
            { name: "App", schema: AppSchema },
            { name: "AppRole", schema: AppRoleSchema },
            { name: "UserAppAccess", schema: UserAppAccessSchema },
            { name: "Rfq", schema: RfqSchema },
            { name: "RfqDraft", schema: RfqDraftSchema },
            { name: "RfqDocument", schema: RfqDocumentSchema },
            { name: "AnonymousDraft", schema: AnonymousDraftSchema },
            { name: "CustomerProfile", schema: CustomerProfileSchema },
            { name: "CustomerOnboarding", schema: CustomerOnboardingSchema },
            { name: "CustomerSession", schema: CustomerSessionSchema },
            { name: "SupplierProfile", schema: SupplierProfileSchema },
            { name: "SupplierOnboarding", schema: SupplierOnboardingSchema },
            { name: "SupplierSession", schema: SupplierSessionSchema },
            { name: "AuditLog", schema: AuditLogSchema },
          ]),
        ]
      : []),
    ...(isMongoDriver()
      ? []
      : [
          TypeOrmModule.forFeature([
            AppPermission,
            AppRolePermission,
            AppRoleProduct,
            UserAccessProduct,
            UserAppPermission,
            UserRole,
            AdminSession,
            App,
            AppRole,
            User,
            UserAppAccess,
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
            CompanyProfile,
            ScheduledJobOverride,
            ScheduledJobsGlobalSettings,
            PollingJobOverride,
            PollingJobsGlobalSettings,
          ]),
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
    FeedbackModule,
    MessagingModule,
    PlatformMetricsModule,
  ],
  providers: [
    AdminAuthService,
    AdminAuthGuard,
    AdminCompanyProfileService,
    AdminDashboardService,
    AdminPlatformLimitsService,
    AdminReferenceDataService,
    AdminRfqService,
    AdminScheduledJobsService,
    AdminPollingJobsService,
    repositoryProvider(
      AdminSessionRepository,
      PostgresAdminSessionRepository,
      MongoAdminSessionRepository,
    ),
    repositoryProvider(
      CompanyProfileRepository,
      PostgresCompanyProfileRepository,
      MongoCompanyProfileRepository,
    ),
    repositoryProvider(
      ScheduledJobOverrideRepository,
      PostgresScheduledJobOverrideRepository,
      MongoScheduledJobOverrideRepository,
    ),
    repositoryProvider(
      ScheduledJobsGlobalSettingsRepository,
      PostgresScheduledJobsGlobalSettingsRepository,
      MongoScheduledJobsGlobalSettingsRepository,
    ),
    repositoryProvider(
      PollingJobOverrideRepository,
      PostgresPollingJobOverrideRepository,
      MongoPollingJobOverrideRepository,
    ),
    repositoryProvider(
      PollingJobsGlobalSettingsRepository,
      PostgresPollingJobsGlobalSettingsRepository,
      MongoPollingJobsGlobalSettingsRepository,
    ),
    repositoryProvider(UserRepository, PostgresUserRepository, MongoUserRepository),
    repositoryProvider(UserRoleRepository, PostgresUserRoleRepository, MongoUserRoleRepository),
    repositoryProvider(AppRepository, PostgresAppRepository, MongoAppRepository),
    repositoryProvider(AppRoleRepository, PostgresAppRoleRepository, MongoAppRoleRepository),
    repositoryProvider(
      UserAppAccessRepository,
      PostgresUserAppAccessRepository,
      MongoUserAppAccessRepository,
    ),
    repositoryProvider(RfqRepository, PostgresRfqRepository, MongoRfqRepository),
    repositoryProvider(RfqDraftRepository, PostgresRfqDraftRepository, MongoRfqDraftRepository),
    repositoryProvider(
      RfqDocumentRepository,
      PostgresRfqDocumentRepository,
      MongoRfqDocumentRepository,
    ),
    repositoryProvider(
      AnonymousDraftRepository,
      PostgresAnonymousDraftRepository,
      MongoAnonymousDraftRepository,
    ),
    repositoryProvider(
      CustomerProfileRepository,
      PostgresCustomerProfileRepository,
      MongoCustomerProfileRepository,
    ),
    repositoryProvider(
      CustomerOnboardingRepository,
      PostgresCustomerOnboardingRepository,
      MongoCustomerOnboardingRepository,
    ),
    repositoryProvider(
      CustomerSessionRepository,
      PostgresCustomerSessionRepository,
      MongoCustomerSessionRepository,
    ),
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
      SupplierSessionRepository,
      PostgresSupplierSessionRepository,
      MongoSupplierSessionRepository,
    ),
    repositoryProvider(AuditLogRepository, PostgresAuditLogRepository, MongoAuditLogRepository),
  ],
  controllers: [
    AdminAiUsageController,
    AdminAuthController,
    AdminCompanyProfileController,
    AdminDashboardController,
    AdminPlatformLimitsController,
    AdminFeedbackController,
    AdminReferenceDataController,
    AdminRfqController,
    AdminMessagingController,
    AdminScheduledJobsController,
    AdminPollingJobsController,
    PublicPollingJobsController,
    PublicCompanyProfileController,
  ],
  exports: [AdminAuthService, AdminAuthGuard, AdminCompanyProfileService, JwtModule],
})
export class AdminModule {}

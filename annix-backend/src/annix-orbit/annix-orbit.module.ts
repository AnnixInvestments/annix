import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { MongooseModule } from "@nestjs/mongoose";
import { MulterModule } from "@nestjs/platform-express";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AdminModule } from "../admin/admin.module";
import { AuditModule } from "../audit/audit.module";
import { EmailModule } from "../email/email.module";
import { FeatureFlagsModule } from "../feature-flags/feature-flags.module";
import { isMongoDriver } from "../lib/persistence/database-driver";
import { repositoryProvider } from "../lib/persistence/repository-provider";
import { MetricsModule } from "../metrics/metrics.module";
import { NixModule } from "../nix/nix.module";
import { CompanyRepository } from "../platform/company.repository";
import { MongoCompanyRepository } from "../platform/company.repository.mongo";
import { PostgresCompanyRepository } from "../platform/company.repository.postgres";
import { Company } from "../platform/entities/company.entity";
import { CompanySchema } from "../platform/schemas/company.schema";
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
import { Rfq } from "../rfq/entities/rfq.entity";
import { RfqRepository } from "../rfq/rfq.repository";
import { MongoRfqRepository } from "../rfq/rfq.repository.mongo";
import { PostgresRfqRepository } from "../rfq/rfq.repository.postgres";
import { RfqSchema } from "../rfq/schemas/rfq.schema";
import { StorageModule } from "../storage/storage.module";
import { User } from "../user/entities/user.entity";
import { UserSchema } from "../user/schemas/user.schema";
import { UserRepository } from "../user/user.repository";
import { MongoUserRepository } from "../user/user.repository.mongo";
import { PostgresUserRepository } from "../user/user.repository.postgres";
import { AnnixOrbitCapabilities } from "./capabilities/annix-orbit.capabilities";
import { AdminEeTargetsController } from "./controllers/admin-ee-targets.controller";
import { AdminOrbitCredentialTypesController } from "./controllers/admin-orbit-credential-types.controller";
import { AdminOrbitJobMarketController } from "./controllers/admin-orbit-job-market.controller";
import { AdminOrbitSeekerController } from "./controllers/admin-orbit-seeker.controller";
import { AnalyticsController } from "./controllers/analytics.controller";
import { AnnixOrbitAuthController } from "./controllers/auth.controller";
import { CandidateController } from "./controllers/candidate.controller";
import { ComplianceController } from "./controllers/compliance.controller";
import { CredentialController } from "./controllers/credential.controller";
import { DashboardController } from "./controllers/dashboard.controller";
import { EmailTemplateController } from "./controllers/email-template.controller";
import { IndividualProfileController } from "./controllers/individual-profile.controller";
import { InterviewBookingController } from "./controllers/interview-booking.controller";
import { JobMarketController } from "./controllers/job-market.controller";
import { JobPostingController } from "./controllers/job-posting.controller";
import { NotificationController } from "./controllers/notification.controller";
import { PortalAdaptersController } from "./controllers/portal-adapters.controller";
import { PublicAccountController } from "./controllers/public-account.controller";
import { PublicEeDisclosureController } from "./controllers/public-ee-disclosure.controller";
import { PublicInterviewBookingController } from "./controllers/public-interview-booking.controller";
import { PublicJobMarketController } from "./controllers/public-job-market.controller";
import { PublicJobPostingController } from "./controllers/public-job-posting.controller";
import { ReferenceFeedbackController } from "./controllers/reference-feedback.controller";
import { ReferencesController } from "./controllers/references.controller";
import { SeekerJobsController } from "./controllers/seeker-jobs.controller";
import { SettingsController } from "./controllers/settings.controller";
import { TradeProfileController } from "./controllers/trade-profile.controller";
import { WorkforceNeedController } from "./controllers/workforce-need.controller";
import { AnnixOrbitCandidateEeAttributes } from "./entities/annix-orbit-candidate-ee-attributes.entity";
import { AnnixOrbitCompany } from "./entities/annix-orbit-company.entity";
import { AnnixOrbitEeConsentTextVersion } from "./entities/annix-orbit-ee-consent-text-version.entity";
import { AnnixOrbitEeDisclosureInvite } from "./entities/annix-orbit-ee-disclosure-invite.entity";
import { AnnixOrbitEeSectoralTarget } from "./entities/annix-orbit-ee-sectoral-target.entity";
import { AnnixOrbitEmailTemplate } from "./entities/annix-orbit-email-template.entity";
import { AnnixOrbitIndividualDocument } from "./entities/annix-orbit-individual-document.entity";
import { AnnixOrbitProfile } from "./entities/annix-orbit-profile.entity";
import { AnnixOrbitUser } from "./entities/annix-orbit-user.entity";
import { Candidate } from "./entities/candidate.entity";
import { CandidateJobMatch } from "./entities/candidate-job-match.entity";
import { CandidateReference } from "./entities/candidate-reference.entity";
import { CvCredential } from "./entities/cv-credential.entity";
import { CvEscoSkill } from "./entities/cv-esco-skill.entity";
import { CvGeocodeCache } from "./entities/cv-geocode-cache.entity";
import { CvPushSubscription } from "./entities/cv-push-subscription.entity";
import { ExternalJob } from "./entities/external-job.entity";
import { ExternalJobAlternate } from "./entities/external-job-alternate.entity";
import { InterviewBooking } from "./entities/interview-booking.entity";
import { InterviewInvite } from "./entities/interview-invite.entity";
import { InterviewSlot } from "./entities/interview-slot.entity";
import { JobMarketSource } from "./entities/job-market-source.entity";
import { JobPosting } from "./entities/job-posting.entity";
import { JobPostingPortalPosting } from "./entities/job-posting-portal-posting.entity";
import { JobScreeningQuestion } from "./entities/job-screening-question.entity";
import { JobSkill } from "./entities/job-skill.entity";
import { JobSuccessMetric } from "./entities/job-success-metric.entity";
import { OrbitCredentialType } from "./entities/orbit-credential-type.entity";
import { SalaryBenchmark } from "./entities/salary-benchmark.entity";
import { SeekerApplyClick } from "./entities/seeker-apply-click.entity";
import { SeekerMute } from "./entities/seeker-mute.entity";
import { SourceRespectRank } from "./entities/source-respect-rank.entity";
import { AnnixOrbitAuthGuard } from "./guards/annix-orbit-auth.guard";
import { AnnixOrbitRoleGuard } from "./guards/annix-orbit-role.guard";
import { AnnixOrbitCandidateEeAttributesRepository } from "./repositories/annix-orbit-candidate-ee-attributes.repository";
import { MongoAnnixOrbitCandidateEeAttributesRepository } from "./repositories/annix-orbit-candidate-ee-attributes.repository.mongo";
import { PostgresAnnixOrbitCandidateEeAttributesRepository } from "./repositories/annix-orbit-candidate-ee-attributes.repository.postgres";
import { AnnixOrbitCompanyRepository } from "./repositories/annix-orbit-company.repository";
import { MongoAnnixOrbitCompanyRepository } from "./repositories/annix-orbit-company.repository.mongo";
import { PostgresAnnixOrbitCompanyRepository } from "./repositories/annix-orbit-company.repository.postgres";
import { AnnixOrbitEeConsentTextVersionRepository } from "./repositories/annix-orbit-ee-consent-text-version.repository";
import { MongoAnnixOrbitEeConsentTextVersionRepository } from "./repositories/annix-orbit-ee-consent-text-version.repository.mongo";
import { PostgresAnnixOrbitEeConsentTextVersionRepository } from "./repositories/annix-orbit-ee-consent-text-version.repository.postgres";
import { AnnixOrbitEeDisclosureInviteRepository } from "./repositories/annix-orbit-ee-disclosure-invite.repository";
import { MongoAnnixOrbitEeDisclosureInviteRepository } from "./repositories/annix-orbit-ee-disclosure-invite.repository.mongo";
import { PostgresAnnixOrbitEeDisclosureInviteRepository } from "./repositories/annix-orbit-ee-disclosure-invite.repository.postgres";
import { AnnixOrbitEeSectoralTargetRepository } from "./repositories/annix-orbit-ee-sectoral-target.repository";
import { MongoAnnixOrbitEeSectoralTargetRepository } from "./repositories/annix-orbit-ee-sectoral-target.repository.mongo";
import { PostgresAnnixOrbitEeSectoralTargetRepository } from "./repositories/annix-orbit-ee-sectoral-target.repository.postgres";
import { AnnixOrbitEmailTemplateRepository } from "./repositories/annix-orbit-email-template.repository";
import { MongoAnnixOrbitEmailTemplateRepository } from "./repositories/annix-orbit-email-template.repository.mongo";
import { PostgresAnnixOrbitEmailTemplateRepository } from "./repositories/annix-orbit-email-template.repository.postgres";
import { AnnixOrbitIndividualDocumentRepository } from "./repositories/annix-orbit-individual-document.repository";
import { MongoAnnixOrbitIndividualDocumentRepository } from "./repositories/annix-orbit-individual-document.repository.mongo";
import { PostgresAnnixOrbitIndividualDocumentRepository } from "./repositories/annix-orbit-individual-document.repository.postgres";
import { AnnixOrbitProfileRepository } from "./repositories/annix-orbit-profile.repository";
import { MongoAnnixOrbitProfileRepository } from "./repositories/annix-orbit-profile.repository.mongo";
import { PostgresAnnixOrbitProfileRepository } from "./repositories/annix-orbit-profile.repository.postgres";
import { AnnixOrbitUserRepository } from "./repositories/annix-orbit-user.repository";
import { MongoAnnixOrbitUserRepository } from "./repositories/annix-orbit-user.repository.mongo";
import { PostgresAnnixOrbitUserRepository } from "./repositories/annix-orbit-user.repository.postgres";
import { CandidateRepository } from "./repositories/candidate.repository";
import { MongoCandidateRepository } from "./repositories/candidate.repository.mongo";
import { PostgresCandidateRepository } from "./repositories/candidate.repository.postgres";
import { CandidateJobMatchRepository } from "./repositories/candidate-job-match.repository";
import { MongoCandidateJobMatchRepository } from "./repositories/candidate-job-match.repository.mongo";
import { PostgresCandidateJobMatchRepository } from "./repositories/candidate-job-match.repository.postgres";
import { CandidateReferenceRepository } from "./repositories/candidate-reference.repository";
import { MongoCandidateReferenceRepository } from "./repositories/candidate-reference.repository.mongo";
import { PostgresCandidateReferenceRepository } from "./repositories/candidate-reference.repository.postgres";
import { CvCredentialRepository } from "./repositories/cv-credential.repository";
import { MongoCvCredentialRepository } from "./repositories/cv-credential.repository.mongo";
import { PostgresCvCredentialRepository } from "./repositories/cv-credential.repository.postgres";
import { CvEscoSkillRepository } from "./repositories/cv-esco-skill.repository";
import { MongoCvEscoSkillRepository } from "./repositories/cv-esco-skill.repository.mongo";
import { PostgresCvEscoSkillRepository } from "./repositories/cv-esco-skill.repository.postgres";
import { CvGeocodeCacheRepository } from "./repositories/cv-geocode-cache.repository";
import { MongoCvGeocodeCacheRepository } from "./repositories/cv-geocode-cache.repository.mongo";
import { PostgresCvGeocodeCacheRepository } from "./repositories/cv-geocode-cache.repository.postgres";
import { CvPushSubscriptionRepository } from "./repositories/cv-push-subscription.repository";
import { MongoCvPushSubscriptionRepository } from "./repositories/cv-push-subscription.repository.mongo";
import { PostgresCvPushSubscriptionRepository } from "./repositories/cv-push-subscription.repository.postgres";
import { ExternalJobRepository } from "./repositories/external-job.repository";
import { MongoExternalJobRepository } from "./repositories/external-job.repository.mongo";
import { PostgresExternalJobRepository } from "./repositories/external-job.repository.postgres";
import { ExternalJobAlternateRepository } from "./repositories/external-job-alternate.repository";
import { MongoExternalJobAlternateRepository } from "./repositories/external-job-alternate.repository.mongo";
import { PostgresExternalJobAlternateRepository } from "./repositories/external-job-alternate.repository.postgres";
import { InterviewBookingRepository } from "./repositories/interview-booking.repository";
import { MongoInterviewBookingRepository } from "./repositories/interview-booking.repository.mongo";
import { PostgresInterviewBookingRepository } from "./repositories/interview-booking.repository.postgres";
import { InterviewInviteRepository } from "./repositories/interview-invite.repository";
import { MongoInterviewInviteRepository } from "./repositories/interview-invite.repository.mongo";
import { PostgresInterviewInviteRepository } from "./repositories/interview-invite.repository.postgres";
import { InterviewSlotRepository } from "./repositories/interview-slot.repository";
import { MongoInterviewSlotRepository } from "./repositories/interview-slot.repository.mongo";
import { PostgresInterviewSlotRepository } from "./repositories/interview-slot.repository.postgres";
import { JobMarketSourceRepository } from "./repositories/job-market-source.repository";
import { MongoJobMarketSourceRepository } from "./repositories/job-market-source.repository.mongo";
import { PostgresJobMarketSourceRepository } from "./repositories/job-market-source.repository.postgres";
import { JobPostingRepository } from "./repositories/job-posting.repository";
import { MongoJobPostingRepository } from "./repositories/job-posting.repository.mongo";
import { PostgresJobPostingRepository } from "./repositories/job-posting.repository.postgres";
import { JobPostingPortalPostingRepository } from "./repositories/job-posting-portal-posting.repository";
import { MongoJobPostingPortalPostingRepository } from "./repositories/job-posting-portal-posting.repository.mongo";
import { PostgresJobPostingPortalPostingRepository } from "./repositories/job-posting-portal-posting.repository.postgres";
import { JobScreeningQuestionRepository } from "./repositories/job-screening-question.repository";
import { MongoJobScreeningQuestionRepository } from "./repositories/job-screening-question.repository.mongo";
import { PostgresJobScreeningQuestionRepository } from "./repositories/job-screening-question.repository.postgres";
import { JobSkillRepository } from "./repositories/job-skill.repository";
import { MongoJobSkillRepository } from "./repositories/job-skill.repository.mongo";
import { PostgresJobSkillRepository } from "./repositories/job-skill.repository.postgres";
import { JobSuccessMetricRepository } from "./repositories/job-success-metric.repository";
import { MongoJobSuccessMetricRepository } from "./repositories/job-success-metric.repository.mongo";
import { PostgresJobSuccessMetricRepository } from "./repositories/job-success-metric.repository.postgres";
import { OrbitCredentialTypeRepository } from "./repositories/orbit-credential-type.repository";
import { MongoOrbitCredentialTypeRepository } from "./repositories/orbit-credential-type.repository.mongo";
import { PostgresOrbitCredentialTypeRepository } from "./repositories/orbit-credential-type.repository.postgres";
import { SalaryBenchmarkRepository } from "./repositories/salary-benchmark.repository";
import { MongoSalaryBenchmarkRepository } from "./repositories/salary-benchmark.repository.mongo";
import { PostgresSalaryBenchmarkRepository } from "./repositories/salary-benchmark.repository.postgres";
import { SeekerApplyClickRepository } from "./repositories/seeker-apply-click.repository";
import { MongoSeekerApplyClickRepository } from "./repositories/seeker-apply-click.repository.mongo";
import { PostgresSeekerApplyClickRepository } from "./repositories/seeker-apply-click.repository.postgres";
import { SeekerMuteRepository } from "./repositories/seeker-mute.repository";
import { MongoSeekerMuteRepository } from "./repositories/seeker-mute.repository.mongo";
import { PostgresSeekerMuteRepository } from "./repositories/seeker-mute.repository.postgres";
import { SourceRespectRankRepository } from "./repositories/source-respect-rank.repository";
import { MongoSourceRespectRankRepository } from "./repositories/source-respect-rank.repository.mongo";
import { PostgresSourceRespectRankRepository } from "./repositories/source-respect-rank.repository.postgres";
import { AnnixOrbitCandidateEeAttributesSchema } from "./schemas/annix-orbit-candidate-ee-attributes.schema";
import { AnnixOrbitCompanySchema } from "./schemas/annix-orbit-company.schema";
import { AnnixOrbitEeConsentTextVersionSchema } from "./schemas/annix-orbit-ee-consent-text-version.schema";
import { AnnixOrbitEeDisclosureInviteSchema } from "./schemas/annix-orbit-ee-disclosure-invite.schema";
import { AnnixOrbitEeSectoralTargetSchema } from "./schemas/annix-orbit-ee-sectoral-target.schema";
import { AnnixOrbitEmailTemplateSchema } from "./schemas/annix-orbit-email-template.schema";
import { AnnixOrbitIndividualDocumentSchema } from "./schemas/annix-orbit-individual-document.schema";
import { AnnixOrbitProfileSchema } from "./schemas/annix-orbit-profile.schema";
import { AnnixOrbitUserSchema } from "./schemas/annix-orbit-user.schema";
import { CandidateSchema } from "./schemas/candidate.schema";
import { CandidateJobMatchSchema } from "./schemas/candidate-job-match.schema";
import { CandidateReferenceSchema } from "./schemas/candidate-reference.schema";
import { CvCredentialSchema } from "./schemas/cv-credential.schema";
import { CvEscoSkillSchema } from "./schemas/cv-esco-skill.schema";
import { CvGeocodeCacheSchema } from "./schemas/cv-geocode-cache.schema";
import { CvPushSubscriptionSchema } from "./schemas/cv-push-subscription.schema";
import { ExternalJobSchema } from "./schemas/external-job.schema";
import { ExternalJobAlternateSchema } from "./schemas/external-job-alternate.schema";
import { InterviewBookingSchema } from "./schemas/interview-booking.schema";
import { InterviewInviteSchema } from "./schemas/interview-invite.schema";
import { InterviewSlotSchema } from "./schemas/interview-slot.schema";
import { JobMarketSourceSchema } from "./schemas/job-market-source.schema";
import { JobPostingSchema } from "./schemas/job-posting.schema";
import { JobPostingPortalPostingSchema } from "./schemas/job-posting-portal-posting.schema";
import { JobScreeningQuestionSchema } from "./schemas/job-screening-question.schema";
import { JobSkillSchema } from "./schemas/job-skill.schema";
import { JobSuccessMetricSchema } from "./schemas/job-success-metric.schema";
import { OrbitCredentialTypeSchema } from "./schemas/orbit-credential-type.schema";
import { SalaryBenchmarkSchema } from "./schemas/salary-benchmark.schema";
import { SeekerApplyClickSchema } from "./schemas/seeker-apply-click.schema";
import { SeekerMuteSchema } from "./schemas/seeker-mute.schema";
import { SourceRespectRankSchema } from "./schemas/source-respect-rank.schema";
import { AssistedPortalAdapters } from "./services/adapters/assisted-portal-adapters.service";
import { FacebookPortalAdapter } from "./services/adapters/facebook-portal-adapter.service";
import { GumtreePortalAdapter } from "./services/adapters/gumtree-portal-adapter.service";
import { IndeedPortalAdapter } from "./services/adapters/indeed-portal-adapter.service";
import { LinkedInPortalAdapter } from "./services/adapters/linkedin-portal-adapter.service";
import { AdzunaService } from "./services/adzuna.service";
import { AnalyticsService } from "./services/analytics.service";
import { AnnixOrbitAuthService } from "./services/auth.service";
import { CandidateService } from "./services/candidate.service";
import { CandidateJobMatchingService } from "./services/candidate-job-matching.service";
import { SitemapCrawlIngestionService } from "./services/crawl/sitemap-crawl-ingestion.service";
import { CredentialService } from "./services/credential.service";
import { CvAuditService } from "./services/cv-audit.service";
import { CvEmailAdapterService } from "./services/cv-email-adapter.service";
import { CvExtractionService } from "./services/cv-extraction.service";
import { CvNotificationService } from "./services/cv-notification.service";
import { CvScreeningService } from "./services/cv-screening.service";
import { DpsaCircularService } from "./services/dpsa-circular.service";
import { EeDisclosureService } from "./services/ee-disclosure.service";
import { EeReportService } from "./services/ee-report.service";
import { EmailTemplateService } from "./services/email-template.service";
import { EmbeddingService } from "./services/embedding.service";
import { EscoNormalisationService } from "./services/esco-normalisation.service";
import { GeocodeService } from "./services/geocode.service";
import { IndividualProfileService } from "./services/individual-profile.service";
import { InterviewBookingService } from "./services/interview-booking.service";
import { JobCategorizationService } from "./services/job-categorization.service";
import { JobIngestionService } from "./services/job-ingestion.service";
import { JobMarketSourceService } from "./services/job-market-source.service";
import { JobMatchService } from "./services/job-match.service";
import { JobPostingService } from "./services/job-posting.service";
import { JobVettingService } from "./services/job-vetting.service";
import { MarketInsightsService } from "./services/market-insights.service";
import { NixCvPdfService } from "./services/nix-cv-pdf.service";
import { NixJobAssistService } from "./services/nix-job-assist.service";
import { NixSeekerAssistService } from "./services/nix-seeker-assist.service";
import { OrbitCredentialTypeService } from "./services/orbit-credential-type.service";
import { PopiaService } from "./services/popia.service";
import { PortalAdapterRegistry } from "./services/portal-adapter-registry.service";
import { PortalPostingOrchestrator } from "./services/portal-posting-orchestrator.service";
import { PortalPostingRetryService } from "./services/portal-posting-retry.service";
import { ReferenceService } from "./services/reference.service";
import { RemotiveService } from "./services/remotive.service";
import { SalaryBenchmarkService } from "./services/salary-benchmark.service";
import { SeekerJobFeedService } from "./services/seeker-job-feed.service";
import { SettingsService } from "./services/settings.service";
import { TestCandidateSeederService } from "./services/test-candidate-seeder.service";
import { TradeProfileService } from "./services/trade-profile.service";
import { WorkflowAutomationService } from "./services/workflow-automation.service";
import { WorkforceNeedService } from "./services/workforce-need.service";

@Module({
  imports: [
    ...(isMongoDriver()
      ? [
          MongooseModule.forFeature([
            { name: "JobPosting", schema: JobPostingSchema },
            { name: "Candidate", schema: CandidateSchema },
            { name: "CandidateReference", schema: CandidateReferenceSchema },
            { name: "JobMarketSource", schema: JobMarketSourceSchema },
            { name: "ExternalJob", schema: ExternalJobSchema },
            { name: "ExternalJobAlternate", schema: ExternalJobAlternateSchema },
            { name: "CandidateJobMatch", schema: CandidateJobMatchSchema },
            { name: "CvPushSubscription", schema: CvPushSubscriptionSchema },
            { name: "AnnixOrbitUser", schema: AnnixOrbitUserSchema },
            {
              name: "AnnixOrbitIndividualDocument",
              schema: AnnixOrbitIndividualDocumentSchema,
            },
            { name: "AnnixOrbitCompany", schema: AnnixOrbitCompanySchema },
            {
              name: "AnnixOrbitCandidateEeAttributes",
              schema: AnnixOrbitCandidateEeAttributesSchema,
            },
            {
              name: "AnnixOrbitEeConsentTextVersion",
              schema: AnnixOrbitEeConsentTextVersionSchema,
            },
            {
              name: "AnnixOrbitEeDisclosureInvite",
              schema: AnnixOrbitEeDisclosureInviteSchema,
            },
            {
              name: "AnnixOrbitEeSectoralTarget",
              schema: AnnixOrbitEeSectoralTargetSchema,
            },
            { name: "AnnixOrbitEmailTemplate", schema: AnnixOrbitEmailTemplateSchema },
            { name: "InterviewSlot", schema: InterviewSlotSchema },
            { name: "InterviewBooking", schema: InterviewBookingSchema },
            { name: "InterviewInvite", schema: InterviewInviteSchema },
            {
              name: "JobPostingPortalPosting",
              schema: JobPostingPortalPostingSchema,
            },
            { name: "JobSkill", schema: JobSkillSchema },
            { name: "JobSuccessMetric", schema: JobSuccessMetricSchema },
            { name: "JobScreeningQuestion", schema: JobScreeningQuestionSchema },
            { name: "SalaryBenchmark", schema: SalaryBenchmarkSchema },
            { name: "SeekerApplyClick", schema: SeekerApplyClickSchema },
            { name: "SeekerMute", schema: SeekerMuteSchema },
            { name: "SourceRespectRank", schema: SourceRespectRankSchema },
            { name: "CvCredential", schema: CvCredentialSchema },
            { name: "OrbitCredentialType", schema: OrbitCredentialTypeSchema },
            { name: "CvEscoSkill", schema: CvEscoSkillSchema },
            { name: "CvGeocodeCache", schema: CvGeocodeCacheSchema },
            { name: "AnnixOrbitProfile", schema: AnnixOrbitProfileSchema },
            { name: "User", schema: UserSchema },
            { name: "Company", schema: CompanySchema },
            { name: "App", schema: AppSchema },
            { name: "AppRole", schema: AppRoleSchema },
            { name: "UserAppAccess", schema: UserAppAccessSchema },
            { name: "Rfq", schema: RfqSchema },
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
            AnnixOrbitProfile,
            User,
            Company,
            App,
            AppRole,
            UserAppAccess,
            JobPosting,
            Candidate,
            CandidateReference,
            JobMarketSource,
            ExternalJob,
            ExternalJobAlternate,
            CandidateJobMatch,
            CvPushSubscription,
            AnnixOrbitUser,
            AnnixOrbitIndividualDocument,
            AnnixOrbitCompany,
            AnnixOrbitCandidateEeAttributes,
            AnnixOrbitEeConsentTextVersion,
            AnnixOrbitEeDisclosureInvite,
            AnnixOrbitEeSectoralTarget,
            AnnixOrbitEmailTemplate,
            InterviewSlot,
            InterviewBooking,
            InterviewInvite,
            JobPostingPortalPosting,
            JobSkill,
            JobSuccessMetric,
            JobScreeningQuestion,
            SalaryBenchmark,
            SeekerApplyClick,
            SeekerMute,
            SourceRespectRank,
            CvCredential,
            OrbitCredentialType,
            CvEscoSkill,
            CvGeocodeCache,
            Rfq,
          ]),
        ]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret:
          configService.get<string>("ANNIX_ORBIT_JWT_SECRET") ??
          configService.get<string>("CV_ASSISTANT_JWT_SECRET", "annix-orbit-jwt-secret"),
        signOptions: { expiresIn: "8h" },
      }),
    }),
    MulterModule.register({
      limits: {
        fileSize: 10 * 1024 * 1024,
      },
    }),
    NixModule,
    MetricsModule,
    EmailModule,
    StorageModule,
    AuditModule,
    AdminModule,
    FeatureFlagsModule,
  ],
  controllers: [
    AnnixOrbitAuthController,
    JobPostingController,
    CandidateController,
    ReferenceFeedbackController,
    DashboardController,
    SettingsController,
    ReferencesController,
    JobMarketController,
    AnalyticsController,
    NotificationController,
    IndividualProfileController,
    PortalAdaptersController,
    PublicJobMarketController,
    PublicJobPostingController,
    PublicAccountController,
    EmailTemplateController,
    InterviewBookingController,
    PublicInterviewBookingController,
    PublicEeDisclosureController,
    ComplianceController,
    AdminEeTargetsController,
    AdminOrbitJobMarketController,
    AdminOrbitSeekerController,
    SeekerJobsController,
    TradeProfileController,
    CredentialController,
    AdminOrbitCredentialTypesController,
    WorkforceNeedController,
  ],
  providers: [
    AnnixOrbitAuthGuard,
    AnnixOrbitRoleGuard,
    AnnixOrbitAuthService,
    CvAuditService,
    JobPostingService,
    CandidateService,
    CvExtractionService,
    JobMatchService,
    ReferenceService,
    CvEmailAdapterService,
    CvScreeningService,
    EeDisclosureService,
    EeReportService,
    WorkflowAutomationService,
    SettingsService,
    AdzunaService,
    RemotiveService,
    DpsaCircularService,
    SitemapCrawlIngestionService,
    JobIngestionService,
    JobCategorizationService,
    JobMarketSourceService,
    JobVettingService,
    EmbeddingService,
    EscoNormalisationService,
    GeocodeService,
    CandidateJobMatchingService,
    PopiaService,
    MarketInsightsService,
    AnalyticsService,
    CvNotificationService,
    IndividualProfileService,
    PortalAdapterRegistry,
    PortalPostingOrchestrator,
    PortalPostingRetryService,
    GumtreePortalAdapter,
    LinkedInPortalAdapter,
    IndeedPortalAdapter,
    FacebookPortalAdapter,
    AssistedPortalAdapters,
    NixJobAssistService,
    NixSeekerAssistService,
    NixCvPdfService,
    SalaryBenchmarkService,
    TestCandidateSeederService,
    EmailTemplateService,
    InterviewBookingService,
    AnnixOrbitCapabilities,
    SeekerJobFeedService,
    TradeProfileService,
    CredentialService,
    OrbitCredentialTypeService,
    WorkforceNeedService,
    repositoryProvider(CandidateRepository, PostgresCandidateRepository, MongoCandidateRepository),
    repositoryProvider(
      JobPostingRepository,
      PostgresJobPostingRepository,
      MongoJobPostingRepository,
    ),
    repositoryProvider(JobSkillRepository, PostgresJobSkillRepository, MongoJobSkillRepository),
    repositoryProvider(
      JobSuccessMetricRepository,
      PostgresJobSuccessMetricRepository,
      MongoJobSuccessMetricRepository,
    ),
    repositoryProvider(
      JobScreeningQuestionRepository,
      PostgresJobScreeningQuestionRepository,
      MongoJobScreeningQuestionRepository,
    ),
    repositoryProvider(
      CandidateReferenceRepository,
      PostgresCandidateReferenceRepository,
      MongoCandidateReferenceRepository,
    ),
    repositoryProvider(
      ExternalJobRepository,
      PostgresExternalJobRepository,
      MongoExternalJobRepository,
    ),
    repositoryProvider(
      ExternalJobAlternateRepository,
      PostgresExternalJobAlternateRepository,
      MongoExternalJobAlternateRepository,
    ),
    repositoryProvider(
      CandidateJobMatchRepository,
      PostgresCandidateJobMatchRepository,
      MongoCandidateJobMatchRepository,
    ),
    repositoryProvider(
      JobMarketSourceRepository,
      PostgresJobMarketSourceRepository,
      MongoJobMarketSourceRepository,
    ),
    repositoryProvider(
      JobPostingPortalPostingRepository,
      PostgresJobPostingPortalPostingRepository,
      MongoJobPostingPortalPostingRepository,
    ),
    repositoryProvider(
      AnnixOrbitProfileRepository,
      PostgresAnnixOrbitProfileRepository,
      MongoAnnixOrbitProfileRepository,
    ),
    repositoryProvider(
      AnnixOrbitUserRepository,
      PostgresAnnixOrbitUserRepository,
      MongoAnnixOrbitUserRepository,
    ),
    repositoryProvider(
      AnnixOrbitCompanyRepository,
      PostgresAnnixOrbitCompanyRepository,
      MongoAnnixOrbitCompanyRepository,
    ),
    repositoryProvider(
      AnnixOrbitIndividualDocumentRepository,
      PostgresAnnixOrbitIndividualDocumentRepository,
      MongoAnnixOrbitIndividualDocumentRepository,
    ),
    repositoryProvider(
      AnnixOrbitCandidateEeAttributesRepository,
      PostgresAnnixOrbitCandidateEeAttributesRepository,
      MongoAnnixOrbitCandidateEeAttributesRepository,
    ),
    repositoryProvider(
      AnnixOrbitEeConsentTextVersionRepository,
      PostgresAnnixOrbitEeConsentTextVersionRepository,
      MongoAnnixOrbitEeConsentTextVersionRepository,
    ),
    repositoryProvider(
      AnnixOrbitEeDisclosureInviteRepository,
      PostgresAnnixOrbitEeDisclosureInviteRepository,
      MongoAnnixOrbitEeDisclosureInviteRepository,
    ),
    repositoryProvider(
      AnnixOrbitEeSectoralTargetRepository,
      PostgresAnnixOrbitEeSectoralTargetRepository,
      MongoAnnixOrbitEeSectoralTargetRepository,
    ),
    repositoryProvider(
      AnnixOrbitEmailTemplateRepository,
      PostgresAnnixOrbitEmailTemplateRepository,
      MongoAnnixOrbitEmailTemplateRepository,
    ),
    repositoryProvider(
      InterviewSlotRepository,
      PostgresInterviewSlotRepository,
      MongoInterviewSlotRepository,
    ),
    repositoryProvider(
      InterviewBookingRepository,
      PostgresInterviewBookingRepository,
      MongoInterviewBookingRepository,
    ),
    repositoryProvider(
      InterviewInviteRepository,
      PostgresInterviewInviteRepository,
      MongoInterviewInviteRepository,
    ),
    repositoryProvider(
      SalaryBenchmarkRepository,
      PostgresSalaryBenchmarkRepository,
      MongoSalaryBenchmarkRepository,
    ),
    repositoryProvider(
      SeekerApplyClickRepository,
      PostgresSeekerApplyClickRepository,
      MongoSeekerApplyClickRepository,
    ),
    repositoryProvider(
      SeekerMuteRepository,
      PostgresSeekerMuteRepository,
      MongoSeekerMuteRepository,
    ),
    repositoryProvider(
      SourceRespectRankRepository,
      PostgresSourceRespectRankRepository,
      MongoSourceRespectRankRepository,
    ),
    repositoryProvider(
      CvCredentialRepository,
      PostgresCvCredentialRepository,
      MongoCvCredentialRepository,
    ),
    repositoryProvider(
      OrbitCredentialTypeRepository,
      PostgresOrbitCredentialTypeRepository,
      MongoOrbitCredentialTypeRepository,
    ),
    repositoryProvider(
      CvEscoSkillRepository,
      PostgresCvEscoSkillRepository,
      MongoCvEscoSkillRepository,
    ),
    repositoryProvider(
      CvGeocodeCacheRepository,
      PostgresCvGeocodeCacheRepository,
      MongoCvGeocodeCacheRepository,
    ),
    repositoryProvider(
      CvPushSubscriptionRepository,
      PostgresCvPushSubscriptionRepository,
      MongoCvPushSubscriptionRepository,
    ),
    repositoryProvider(UserRepository, PostgresUserRepository, MongoUserRepository),
    repositoryProvider(CompanyRepository, PostgresCompanyRepository, MongoCompanyRepository),
    repositoryProvider(AppRepository, PostgresAppRepository, MongoAppRepository),
    repositoryProvider(AppRoleRepository, PostgresAppRoleRepository, MongoAppRoleRepository),
    repositoryProvider(
      UserAppAccessRepository,
      PostgresUserAppAccessRepository,
      MongoUserAppAccessRepository,
    ),
    repositoryProvider(RfqRepository, PostgresRfqRepository, MongoRfqRepository),
  ],
  exports: [AnnixOrbitAuthService],
})
export class AnnixOrbitModule {}

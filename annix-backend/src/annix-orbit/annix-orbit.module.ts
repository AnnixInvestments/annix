import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { MulterModule } from "@nestjs/platform-express";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AdminModule } from "../admin/admin.module";
import { AuditModule } from "../audit/audit.module";
import { EmailModule } from "../email/email.module";
import { FeatureFlagsModule } from "../feature-flags/feature-flags.module";
import { MetricsModule } from "../metrics/metrics.module";
import { NixModule } from "../nix/nix.module";
import { Company } from "../platform/entities/company.entity";
import { App } from "../rbac/entities/app.entity";
import { AppRole } from "../rbac/entities/app-role.entity";
import { UserAppAccess } from "../rbac/entities/user-app-access.entity";
import { Rfq } from "../rfq/entities/rfq.entity";
import { StorageModule } from "../storage/storage.module";
import { User } from "../user/entities/user.entity";
import { AnnixOrbitCapabilities } from "./capabilities/annix-orbit.capabilities";
import { AdminEeTargetsController } from "./controllers/admin-ee-targets.controller";
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
import { SalaryBenchmark } from "./entities/salary-benchmark.entity";
import { SeekerApplyClick } from "./entities/seeker-apply-click.entity";
import { SeekerMute } from "./entities/seeker-mute.entity";
import { AnnixOrbitAuthGuard } from "./guards/annix-orbit-auth.guard";
import { AnnixOrbitRoleGuard } from "./guards/annix-orbit-role.guard";
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
import { JobIngestionService } from "./services/job-ingestion.service";
import { JobMarketSourceService } from "./services/job-market-source.service";
import { JobMatchService } from "./services/job-match.service";
import { JobPostingService } from "./services/job-posting.service";
import { JoobleService } from "./services/jooble.service";
import { MarketInsightsService } from "./services/market-insights.service";
import { NixCvPdfService } from "./services/nix-cv-pdf.service";
import { NixJobAssistService } from "./services/nix-job-assist.service";
import { NixSeekerAssistService } from "./services/nix-seeker-assist.service";
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
    TypeOrmModule.forFeature([
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
      CvCredential,
      CvEscoSkill,
      CvGeocodeCache,
      Rfq,
    ]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret:
          configService.get<string>("ANNIX_ORBIT_JWT_SECRET") ??
          configService.get<string>("CV_ASSISTANT_JWT_SECRET", "annix-orbit-jwt-secret"),
        signOptions: { expiresIn: "1h" },
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
    SeekerJobsController,
    TradeProfileController,
    CredentialController,
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
    JoobleService,
    RemotiveService,
    DpsaCircularService,
    JobIngestionService,
    JobMarketSourceService,
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
    WorkforceNeedService,
  ],
  exports: [AnnixOrbitAuthService],
})
export class AnnixOrbitModule {}

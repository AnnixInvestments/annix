import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { MulterModule } from "@nestjs/platform-express";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuditModule } from "../audit/audit.module";
import { EmailModule } from "../email/email.module";
import { MetricsModule } from "../metrics/metrics.module";
import { NixModule } from "../nix/nix.module";
import { Company } from "../platform/entities/company.entity";
import { App } from "../rbac/entities/app.entity";
import { AppRole } from "../rbac/entities/app-role.entity";
import { UserAppAccess } from "../rbac/entities/user-app-access.entity";
import { StorageModule } from "../storage/storage.module";
import { User } from "../user/entities/user.entity";
import { AnalyticsController } from "./controllers/analytics.controller";
import { CvAssistantAuthController } from "./controllers/auth.controller";
import { CandidateController } from "./controllers/candidate.controller";
import { DashboardController } from "./controllers/dashboard.controller";
import { IndividualProfileController } from "./controllers/individual-profile.controller";
import { JobMarketController } from "./controllers/job-market.controller";
import { JobPostingController } from "./controllers/job-posting.controller";
import { NotificationController } from "./controllers/notification.controller";
import { PortalAdaptersController } from "./controllers/portal-adapters.controller";
import { PublicAccountController } from "./controllers/public-account.controller";
import { PublicJobMarketController } from "./controllers/public-job-market.controller";
import { PublicJobPostingController } from "./controllers/public-job-posting.controller";
import { ReferenceFeedbackController } from "./controllers/reference-feedback.controller";
import { ReferencesController } from "./controllers/references.controller";
import { SettingsController } from "./controllers/settings.controller";
import { Candidate } from "./entities/candidate.entity";
import { CandidateJobMatch } from "./entities/candidate-job-match.entity";
import { CandidateReference } from "./entities/candidate-reference.entity";
import { CvAssistantCompany } from "./entities/cv-assistant-company.entity";
import { CvAssistantIndividualDocument } from "./entities/cv-assistant-individual-document.entity";
import { CvAssistantProfile } from "./entities/cv-assistant-profile.entity";
import { CvAssistantUser } from "./entities/cv-assistant-user.entity";
import { CvPushSubscription } from "./entities/cv-push-subscription.entity";
import { ExternalJob } from "./entities/external-job.entity";
import { JobMarketSource } from "./entities/job-market-source.entity";
import { JobPosting } from "./entities/job-posting.entity";
import { JobPostingPortalPosting } from "./entities/job-posting-portal-posting.entity";
import { JobScreeningQuestion } from "./entities/job-screening-question.entity";
import { JobSkill } from "./entities/job-skill.entity";
import { JobSuccessMetric } from "./entities/job-success-metric.entity";
import { SalaryBenchmark } from "./entities/salary-benchmark.entity";
import { CvAssistantAuthGuard } from "./guards/cv-assistant-auth.guard";
import { CvAssistantRoleGuard } from "./guards/cv-assistant-role.guard";
import { FacebookPortalAdapter } from "./services/adapters/facebook-portal-adapter.service";
import { GumtreePortalAdapter } from "./services/adapters/gumtree-portal-adapter.service";
import { IndeedPortalAdapter } from "./services/adapters/indeed-portal-adapter.service";
import { LinkedInPortalAdapter } from "./services/adapters/linkedin-portal-adapter.service";
import { AdzunaService } from "./services/adzuna.service";
import { AnalyticsService } from "./services/analytics.service";
import { CvAssistantAuthService } from "./services/auth.service";
import { CandidateService } from "./services/candidate.service";
import { CandidateJobMatchingService } from "./services/candidate-job-matching.service";
import { CvAuditService } from "./services/cv-audit.service";
import { CvEmailAdapterService } from "./services/cv-email-adapter.service";
import { CvExtractionService } from "./services/cv-extraction.service";
import { CvNotificationService } from "./services/cv-notification.service";
import { CvScreeningService } from "./services/cv-screening.service";
import { EmbeddingService } from "./services/embedding.service";
import { IndividualProfileService } from "./services/individual-profile.service";
import { JobIngestionService } from "./services/job-ingestion.service";
import { JobMarketSourceService } from "./services/job-market-source.service";
import { JobMatchService } from "./services/job-match.service";
import { JobPostingService } from "./services/job-posting.service";
import { MarketInsightsService } from "./services/market-insights.service";
import { NixJobAssistService } from "./services/nix-job-assist.service";
import { PopiaService } from "./services/popia.service";
import { PortalAdapterRegistry } from "./services/portal-adapter-registry.service";
import { PortalPostingOrchestrator } from "./services/portal-posting-orchestrator.service";
import { PortalPostingRetryService } from "./services/portal-posting-retry.service";
import { ReferenceService } from "./services/reference.service";
import { SettingsService } from "./services/settings.service";
import { WorkflowAutomationService } from "./services/workflow-automation.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CvAssistantProfile,
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
      CandidateJobMatch,
      CvPushSubscription,
      CvAssistantUser,
      CvAssistantIndividualDocument,
      CvAssistantCompany,
      JobPostingPortalPosting,
      JobSkill,
      JobSuccessMetric,
      JobScreeningQuestion,
      SalaryBenchmark,
    ]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>("CV_ASSISTANT_JWT_SECRET", "cv-assistant-jwt-secret"),
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
  ],
  controllers: [
    CvAssistantAuthController,
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
  ],
  providers: [
    CvAssistantAuthGuard,
    CvAssistantRoleGuard,
    CvAssistantAuthService,
    CvAuditService,
    JobPostingService,
    CandidateService,
    CvExtractionService,
    JobMatchService,
    ReferenceService,
    CvEmailAdapterService,
    CvScreeningService,
    WorkflowAutomationService,
    SettingsService,
    AdzunaService,
    JobIngestionService,
    JobMarketSourceService,
    EmbeddingService,
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
    NixJobAssistService,
  ],
  exports: [CvAssistantAuthService],
})
export class CvAssistantModule {}

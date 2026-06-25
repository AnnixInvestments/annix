import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { MongooseModule } from "@nestjs/mongoose";
import { MulterModule } from "@nestjs/platform-express";
import { AdminModule } from "../admin/admin.module";
import { AuditModule } from "../audit/audit.module";
import { EmailModule } from "../email/email.module";
import { FeatureFlagsModule } from "../feature-flags/feature-flags.module";
import { FeedbackModule } from "../feedback/feedback.module";
import { LibreOfficeConversionService } from "../lib/libreoffice-conversion.service";
import { ORBIT_CONNECTION } from "../lib/persistence/mongo-connections";
import { repositoryProvider } from "../lib/persistence/repository-provider";
import { LicensingModule } from "../licensing";
import { MetricsModule } from "../metrics/metrics.module";
import { NixModule } from "../nix/nix.module";
import { CompanyRepository } from "../platform/company.repository";
import { MongoCompanyRepository } from "../platform/company.repository.mongo";
import { CompanySchema } from "../platform/schemas/company.schema";
import { AppRepository, AppRoleRepository, UserAppAccessRepository } from "../rbac/rbac.repository";
import {
  MongoAppRepository,
  MongoAppRoleRepository,
  MongoUserAppAccessRepository,
} from "../rbac/rbac.repository.mongo";
import { AppSchema } from "../rbac/schemas/app.schema";
import { AppRoleSchema } from "../rbac/schemas/app-role.schema";
import { UserAppAccessSchema } from "../rbac/schemas/user-app-access.schema";
import { RfqRepository } from "../rfq/rfq.repository";
import { MongoRfqRepository } from "../rfq/rfq.repository.mongo";
import { RfqSchema } from "../rfq/schemas/rfq.schema";
import { StorageModule } from "../storage/storage.module";
import { UserSchema } from "../user/schemas/user.schema";
import { UserRepository } from "../user/user.repository";
import { MongoUserRepository } from "../user/user.repository.mongo";
import { WhatsAppConversationRepository } from "../whatsapp/repositories/whatsapp-conversation.repository";
import { MongoWhatsAppConversationRepository } from "../whatsapp/repositories/whatsapp-conversation.repository.mongo";
import { WhatsAppMessageRepository } from "../whatsapp/repositories/whatsapp-message.repository";
import { MongoWhatsAppMessageRepository } from "../whatsapp/repositories/whatsapp-message.repository.mongo";
import { WhatsAppConversationSchema } from "../whatsapp/schemas/whatsapp-conversation.schema";
import { WhatsAppMessageSchema } from "../whatsapp/schemas/whatsapp-message.schema";
import { WhatsAppModule } from "../whatsapp/whatsapp.module";
import { resolveAnnixOrbitJwtSecret } from "./annix-orbit.constants";
import { AnnixOrbitLicensingRegistrar } from "./annix-orbit-licensing.registrar";
import { AnnixOrbitRecruiterLicensingRegistrar } from "./annix-orbit-recruiter-licensing.registrar";
import { AnnixOrbitStudentLicensingRegistrar } from "./annix-orbit-student-licensing.registrar";
import { AnnixOrbitCapabilities } from "./capabilities/annix-orbit.capabilities";
import { PaystackConfigService } from "./config/paystack.config";
import { AdminEeTargetsController } from "./controllers/admin-ee-targets.controller";
import { AdminOrbitCredentialTypesController } from "./controllers/admin-orbit-credential-types.controller";
import { AdminOrbitDelistReportsController } from "./controllers/admin-orbit-delist-reports.controller";
import { AdminOrbitDismissReasonsController } from "./controllers/admin-orbit-dismiss-reasons.controller";
import { AdminOrbitEarlyAccessController } from "./controllers/admin-orbit-early-access.controller";
import { AdminOrbitJobMarketController } from "./controllers/admin-orbit-job-market.controller";
import { AdminOrbitOutreachController } from "./controllers/admin-orbit-outreach.controller";
import { AdminOrbitSeekerController } from "./controllers/admin-orbit-seeker.controller";
import { AdminOrbitSeekerTestingController } from "./controllers/admin-orbit-seeker-testing.controller";
import { AdminOrbitTierCapabilitiesController } from "./controllers/admin-orbit-tier-capabilities.controller";
import { AdminOrbitUsersController } from "./controllers/admin-orbit-users.controller";
import { AnalyticsController } from "./controllers/analytics.controller";
import { AnnixOrbitAuditController } from "./controllers/annix-orbit-audit.controller";
import { AnnixOrbitClientController } from "./controllers/annix-orbit-client.controller";
import { AnnixOrbitComplianceItemController } from "./controllers/annix-orbit-compliance-item.controller";
import { AnnixOrbitJobController } from "./controllers/annix-orbit-job.controller";
import { AnnixOrbitMessageController } from "./controllers/annix-orbit-message.controller";
import { AnnixOrbitPlacementController } from "./controllers/annix-orbit-placement.controller";
import { AnnixOrbitRecruiterAssistantController } from "./controllers/annix-orbit-recruiter-assistant.controller";
import { AnnixOrbitRecruiterInterviewController } from "./controllers/annix-orbit-recruiter-interview.controller";
import { AnnixOrbitShortlistController } from "./controllers/annix-orbit-shortlist.controller";
import { AnnixOrbitSubmissionController } from "./controllers/annix-orbit-submission.controller";
import { AnnixOrbitTalentCandidateController } from "./controllers/annix-orbit-talent-candidate.controller";
import { AnnixOrbitTalentCredentialController } from "./controllers/annix-orbit-talent-credential.controller";
import { AnnixOrbitTalentPoolController } from "./controllers/annix-orbit-talent-pool.controller";
import { AnnixOrbitTaskController } from "./controllers/annix-orbit-task.controller";
import { AnnixOrbitTeamController } from "./controllers/annix-orbit-team.controller";
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
import { PaystackWebhookController } from "./controllers/paystack-webhook.controller";
import { PortalAdaptersController } from "./controllers/portal-adapters.controller";
import { PublicAccountController } from "./controllers/public-account.controller";
import { PublicEarlyAccessController } from "./controllers/public-early-access.controller";
import { PublicEeDisclosureController } from "./controllers/public-ee-disclosure.controller";
import { PublicInterviewBookingController } from "./controllers/public-interview-booking.controller";
import { PublicJobMarketController } from "./controllers/public-job-market.controller";
import { PublicJobPostingController } from "./controllers/public-job-posting.controller";
import { PublicOrbitShortlistController } from "./controllers/public-orbit-shortlist.controller";
import { PublicSeekerCalendarController } from "./controllers/public-seeker-calendar.controller";
import { PublicTierPlansController } from "./controllers/public-tier-plans.controller";
import { RecruiterDashboardController } from "./controllers/recruiter-dashboard.controller";
import { ReferenceFeedbackController } from "./controllers/reference-feedback.controller";
import { ReferencesController } from "./controllers/references.controller";
import { SeekerApplicationsController } from "./controllers/seeker-applications.controller";
import { SeekerAssistantController } from "./controllers/seeker-assistant.controller";
import { SeekerBillingController } from "./controllers/seeker-billing.controller";
import { SeekerCalendarController } from "./controllers/seeker-calendar.controller";
import { SeekerEmploymentController } from "./controllers/seeker-employment.controller";
import { SeekerInterviewEventsController } from "./controllers/seeker-interview-events.controller";
import { SeekerJobsController } from "./controllers/seeker-jobs.controller";
import { SeekerReminderPreferencesController } from "./controllers/seeker-reminder-preferences.controller";
import { SettingsController } from "./controllers/settings.controller";
import { WorkProfileController } from "./controllers/work-profile.controller";
import { AnnixOrbitAuthGuard } from "./guards/annix-orbit-auth.guard";
import { AnnixOrbitRoleGuard } from "./guards/annix-orbit-role.guard";
import { AnnixOrbitAuditEventRepository } from "./repositories/annix-orbit-audit-event.repository";
import { MongoAnnixOrbitAuditEventRepository } from "./repositories/annix-orbit-audit-event.repository.mongo";
import { AnnixOrbitCandidateEeAttributesRepository } from "./repositories/annix-orbit-candidate-ee-attributes.repository";
import { MongoAnnixOrbitCandidateEeAttributesRepository } from "./repositories/annix-orbit-candidate-ee-attributes.repository.mongo";
import { AnnixOrbitClientRepository } from "./repositories/annix-orbit-client.repository";
import { MongoAnnixOrbitClientRepository } from "./repositories/annix-orbit-client.repository.mongo";
import { AnnixOrbitCompanyRepository } from "./repositories/annix-orbit-company.repository";
import { MongoAnnixOrbitCompanyRepository } from "./repositories/annix-orbit-company.repository.mongo";
import { AnnixOrbitComplianceItemRepository } from "./repositories/annix-orbit-compliance-item.repository";
import { MongoAnnixOrbitComplianceItemRepository } from "./repositories/annix-orbit-compliance-item.repository.mongo";
import { AnnixOrbitEeConsentTextVersionRepository } from "./repositories/annix-orbit-ee-consent-text-version.repository";
import { MongoAnnixOrbitEeConsentTextVersionRepository } from "./repositories/annix-orbit-ee-consent-text-version.repository.mongo";
import { AnnixOrbitEeDisclosureInviteRepository } from "./repositories/annix-orbit-ee-disclosure-invite.repository";
import { MongoAnnixOrbitEeDisclosureInviteRepository } from "./repositories/annix-orbit-ee-disclosure-invite.repository.mongo";
import { AnnixOrbitEeSectoralTargetRepository } from "./repositories/annix-orbit-ee-sectoral-target.repository";
import { MongoAnnixOrbitEeSectoralTargetRepository } from "./repositories/annix-orbit-ee-sectoral-target.repository.mongo";
import { AnnixOrbitEmailTemplateRepository } from "./repositories/annix-orbit-email-template.repository";
import { MongoAnnixOrbitEmailTemplateRepository } from "./repositories/annix-orbit-email-template.repository.mongo";
import { AnnixOrbitIndividualDocumentRepository } from "./repositories/annix-orbit-individual-document.repository";
import { MongoAnnixOrbitIndividualDocumentRepository } from "./repositories/annix-orbit-individual-document.repository.mongo";
import { AnnixOrbitJobRepository } from "./repositories/annix-orbit-job.repository";
import { MongoAnnixOrbitJobRepository } from "./repositories/annix-orbit-job.repository.mongo";
import { AnnixOrbitPlacementRepository } from "./repositories/annix-orbit-placement.repository";
import { MongoAnnixOrbitPlacementRepository } from "./repositories/annix-orbit-placement.repository.mongo";
import { AnnixOrbitProfileRepository } from "./repositories/annix-orbit-profile.repository";
import { MongoAnnixOrbitProfileRepository } from "./repositories/annix-orbit-profile.repository.mongo";
import { AnnixOrbitRecruiterInterviewRepository } from "./repositories/annix-orbit-recruiter-interview.repository";
import { MongoAnnixOrbitRecruiterInterviewRepository } from "./repositories/annix-orbit-recruiter-interview.repository.mongo";
import { AnnixOrbitShortlistRepository } from "./repositories/annix-orbit-shortlist.repository";
import { MongoAnnixOrbitShortlistRepository } from "./repositories/annix-orbit-shortlist.repository.mongo";
import { AnnixOrbitSubmissionRepository } from "./repositories/annix-orbit-submission.repository";
import { MongoAnnixOrbitSubmissionRepository } from "./repositories/annix-orbit-submission.repository.mongo";
import { AnnixOrbitTalentCandidateRepository } from "./repositories/annix-orbit-talent-candidate.repository";
import { MongoAnnixOrbitTalentCandidateRepository } from "./repositories/annix-orbit-talent-candidate.repository.mongo";
import { AnnixOrbitTalentCredentialRepository } from "./repositories/annix-orbit-talent-credential.repository";
import { MongoAnnixOrbitTalentCredentialRepository } from "./repositories/annix-orbit-talent-credential.repository.mongo";
import { AnnixOrbitTalentPoolRepository } from "./repositories/annix-orbit-talent-pool.repository";
import { MongoAnnixOrbitTalentPoolRepository } from "./repositories/annix-orbit-talent-pool.repository.mongo";
import { AnnixOrbitTaskRepository } from "./repositories/annix-orbit-task.repository";
import { MongoAnnixOrbitTaskRepository } from "./repositories/annix-orbit-task.repository.mongo";
import { AnnixOrbitTeamInviteRepository } from "./repositories/annix-orbit-team-invite.repository";
import { MongoAnnixOrbitTeamInviteRepository } from "./repositories/annix-orbit-team-invite.repository.mongo";
import { AnnixOrbitUserRepository } from "./repositories/annix-orbit-user.repository";
import { MongoAnnixOrbitUserRepository } from "./repositories/annix-orbit-user.repository.mongo";
import { CandidateRepository } from "./repositories/candidate.repository";
import { MongoCandidateRepository } from "./repositories/candidate.repository.mongo";
import { CandidateJobMatchRepository } from "./repositories/candidate-job-match.repository";
import { MongoCandidateJobMatchRepository } from "./repositories/candidate-job-match.repository.mongo";
import { CandidateReferenceRepository } from "./repositories/candidate-reference.repository";
import { MongoCandidateReferenceRepository } from "./repositories/candidate-reference.repository.mongo";
import { CvCredentialRepository } from "./repositories/cv-credential.repository";
import { MongoCvCredentialRepository } from "./repositories/cv-credential.repository.mongo";
import { CvEscoSkillRepository } from "./repositories/cv-esco-skill.repository";
import { MongoCvEscoSkillRepository } from "./repositories/cv-esco-skill.repository.mongo";
import { CvGeocodeCacheRepository } from "./repositories/cv-geocode-cache.repository";
import { MongoCvGeocodeCacheRepository } from "./repositories/cv-geocode-cache.repository.mongo";
import { CvPushSubscriptionRepository } from "./repositories/cv-push-subscription.repository";
import { MongoCvPushSubscriptionRepository } from "./repositories/cv-push-subscription.repository.mongo";
import { ExternalJobRepository } from "./repositories/external-job.repository";
import { MongoExternalJobRepository } from "./repositories/external-job.repository.mongo";
import { ExternalJobAlternateRepository } from "./repositories/external-job-alternate.repository";
import { MongoExternalJobAlternateRepository } from "./repositories/external-job-alternate.repository.mongo";
import { InterviewBookingRepository } from "./repositories/interview-booking.repository";
import { MongoInterviewBookingRepository } from "./repositories/interview-booking.repository.mongo";
import { InterviewInviteRepository } from "./repositories/interview-invite.repository";
import { MongoInterviewInviteRepository } from "./repositories/interview-invite.repository.mongo";
import { InterviewSlotRepository } from "./repositories/interview-slot.repository";
import { MongoInterviewSlotRepository } from "./repositories/interview-slot.repository.mongo";
import { JobAnalysisCacheRepository } from "./repositories/job-analysis-cache.repository";
import { MongoJobAnalysisCacheRepository } from "./repositories/job-analysis-cache.repository.mongo";
import { JobMarketSourceRepository } from "./repositories/job-market-source.repository";
import { MongoJobMarketSourceRepository } from "./repositories/job-market-source.repository.mongo";
import { JobPostingRepository } from "./repositories/job-posting.repository";
import { MongoJobPostingRepository } from "./repositories/job-posting.repository.mongo";
import { JobPostingPortalPostingRepository } from "./repositories/job-posting-portal-posting.repository";
import { MongoJobPostingPortalPostingRepository } from "./repositories/job-posting-portal-posting.repository.mongo";
import { JobScreeningQuestionRepository } from "./repositories/job-screening-question.repository";
import { MongoJobScreeningQuestionRepository } from "./repositories/job-screening-question.repository.mongo";
import { JobSkillRepository } from "./repositories/job-skill.repository";
import { MongoJobSkillRepository } from "./repositories/job-skill.repository.mongo";
import { JobSuccessMetricRepository } from "./repositories/job-success-metric.repository";
import { MongoJobSuccessMetricRepository } from "./repositories/job-success-metric.repository.mongo";
import { OrbitCredentialTypeRepository } from "./repositories/orbit-credential-type.repository";
import { MongoOrbitCredentialTypeRepository } from "./repositories/orbit-credential-type.repository.mongo";
import { OrbitDismissReasonRepository } from "./repositories/orbit-dismiss-reason.repository";
import { MongoOrbitDismissReasonRepository } from "./repositories/orbit-dismiss-reason.repository.mongo";
import { OrbitEarlyAccessSignupRepository } from "./repositories/orbit-early-access-signup.repository";
import { MongoOrbitEarlyAccessSignupRepository } from "./repositories/orbit-early-access-signup.repository.mongo";
import { OrbitOutreachAssetRepository } from "./repositories/orbit-outreach-asset.repository";
import { MongoOrbitOutreachAssetRepository } from "./repositories/orbit-outreach-asset.repository.mongo";
import { OrbitOutreachScheduleRepository } from "./repositories/orbit-outreach-schedule.repository";
import { MongoOrbitOutreachScheduleRepository } from "./repositories/orbit-outreach-schedule.repository.mongo";
import { OrbitTierCapabilityRepository } from "./repositories/orbit-tier-capability.repository";
import { MongoOrbitTierCapabilityRepository } from "./repositories/orbit-tier-capability.repository.mongo";
import { PendingSeekerTierRepository } from "./repositories/pending-seeker-tier.repository";
import { MongoPendingSeekerTierRepository } from "./repositories/pending-seeker-tier.repository.mongo";
import { SalaryBenchmarkRepository } from "./repositories/salary-benchmark.repository";
import { MongoSalaryBenchmarkRepository } from "./repositories/salary-benchmark.repository.mongo";
import { SeekerApplyClickRepository } from "./repositories/seeker-apply-click.repository";
import { MongoSeekerApplyClickRepository } from "./repositories/seeker-apply-click.repository.mongo";
import { SeekerBillingEventRepository } from "./repositories/seeker-billing-event.repository";
import { MongoSeekerBillingEventRepository } from "./repositories/seeker-billing-event.repository.mongo";
import { SeekerEmploymentRecordRepository } from "./repositories/seeker-employment-record.repository";
import { MongoSeekerEmploymentRecordRepository } from "./repositories/seeker-employment-record.repository.mongo";
import { SeekerInterviewEventRepository } from "./repositories/seeker-interview-event.repository";
import { MongoSeekerInterviewEventRepository } from "./repositories/seeker-interview-event.repository.mongo";
import { SeekerInterviewReminderRepository } from "./repositories/seeker-interview-reminder.repository";
import { MongoSeekerInterviewReminderRepository } from "./repositories/seeker-interview-reminder.repository.mongo";
import { SeekerLaunchReadinessSnapshotRepository } from "./repositories/seeker-launch-readiness-snapshot.repository";
import { MongoSeekerLaunchReadinessSnapshotRepository } from "./repositories/seeker-launch-readiness-snapshot.repository.mongo";
import { SeekerMuteRepository } from "./repositories/seeker-mute.repository";
import { MongoSeekerMuteRepository } from "./repositories/seeker-mute.repository.mongo";
import { SeekerTestEventRepository } from "./repositories/seeker-test-event.repository";
import { MongoSeekerTestEventRepository } from "./repositories/seeker-test-event.repository.mongo";
import { SeekerTestParticipantRepository } from "./repositories/seeker-test-participant.repository";
import { MongoSeekerTestParticipantRepository } from "./repositories/seeker-test-participant.repository.mongo";
import { SeekerTestPhaseRepository } from "./repositories/seeker-test-phase.repository";
import { MongoSeekerTestPhaseRepository } from "./repositories/seeker-test-phase.repository.mongo";
import { SeekerTestingIssueRepository } from "./repositories/seeker-testing-issue.repository";
import { MongoSeekerTestingIssueRepository } from "./repositories/seeker-testing-issue.repository.mongo";
import { SeekerUsageCounterRepository } from "./repositories/seeker-usage-counter.repository";
import { MongoSeekerUsageCounterRepository } from "./repositories/seeker-usage-counter.repository.mongo";
import { SeekerWorkflowProgressRepository } from "./repositories/seeker-workflow-progress.repository";
import { MongoSeekerWorkflowProgressRepository } from "./repositories/seeker-workflow-progress.repository.mongo";
import { SeekerWorkflowStepRepository } from "./repositories/seeker-workflow-step.repository";
import { MongoSeekerWorkflowStepRepository } from "./repositories/seeker-workflow-step.repository.mongo";
import { SourceRespectRankRepository } from "./repositories/source-respect-rank.repository";
import { MongoSourceRespectRankRepository } from "./repositories/source-respect-rank.repository.mongo";
import { AnnixOrbitAuditEventSchema } from "./schemas/annix-orbit-audit-event.schema";
import { AnnixOrbitCandidateEeAttributesSchema } from "./schemas/annix-orbit-candidate-ee-attributes.schema";
import { AnnixOrbitClientSchema } from "./schemas/annix-orbit-client.schema";
import { AnnixOrbitCompanySchema } from "./schemas/annix-orbit-company.schema";
import { AnnixOrbitComplianceItemSchema } from "./schemas/annix-orbit-compliance-item.schema";
import { AnnixOrbitEeConsentTextVersionSchema } from "./schemas/annix-orbit-ee-consent-text-version.schema";
import { AnnixOrbitEeDisclosureInviteSchema } from "./schemas/annix-orbit-ee-disclosure-invite.schema";
import { AnnixOrbitEeSectoralTargetSchema } from "./schemas/annix-orbit-ee-sectoral-target.schema";
import { AnnixOrbitEmailTemplateSchema } from "./schemas/annix-orbit-email-template.schema";
import { AnnixOrbitIndividualDocumentSchema } from "./schemas/annix-orbit-individual-document.schema";
import { AnnixOrbitJobSchema } from "./schemas/annix-orbit-job.schema";
import { AnnixOrbitPlacementSchema } from "./schemas/annix-orbit-placement.schema";
import { AnnixOrbitProfileSchema } from "./schemas/annix-orbit-profile.schema";
import { AnnixOrbitRecruiterInterviewSchema } from "./schemas/annix-orbit-recruiter-interview.schema";
import { AnnixOrbitShortlistSchema } from "./schemas/annix-orbit-shortlist.schema";
import { AnnixOrbitSubmissionSchema } from "./schemas/annix-orbit-submission.schema";
import { AnnixOrbitTalentCandidateSchema } from "./schemas/annix-orbit-talent-candidate.schema";
import { AnnixOrbitTalentCredentialSchema } from "./schemas/annix-orbit-talent-credential.schema";
import { AnnixOrbitTalentPoolSchema } from "./schemas/annix-orbit-talent-pool.schema";
import { AnnixOrbitTaskSchema } from "./schemas/annix-orbit-task.schema";
import { AnnixOrbitTeamInviteSchema } from "./schemas/annix-orbit-team-invite.schema";
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
import { ExternalJobEmbeddingSchema } from "./schemas/external-job-embedding.schema";
import { InterviewBookingSchema } from "./schemas/interview-booking.schema";
import { InterviewInviteSchema } from "./schemas/interview-invite.schema";
import { InterviewSlotSchema } from "./schemas/interview-slot.schema";
import { JobAnalysisCacheSchema } from "./schemas/job-analysis-cache.schema";
import { JobMarketSourceSchema } from "./schemas/job-market-source.schema";
import { JobPostingSchema } from "./schemas/job-posting.schema";
import { JobPostingPortalPostingSchema } from "./schemas/job-posting-portal-posting.schema";
import { JobScreeningQuestionSchema } from "./schemas/job-screening-question.schema";
import { JobSkillSchema } from "./schemas/job-skill.schema";
import { JobSuccessMetricSchema } from "./schemas/job-success-metric.schema";
import { OrbitCredentialTypeSchema } from "./schemas/orbit-credential-type.schema";
import { OrbitDismissReasonSchema } from "./schemas/orbit-dismiss-reason.schema";
import { OrbitEarlyAccessSignupSchema } from "./schemas/orbit-early-access-signup.schema";
import { OrbitOutreachAssetSchema } from "./schemas/orbit-outreach-asset.schema";
import { OrbitOutreachScheduleSchema } from "./schemas/orbit-outreach-schedule.schema";
import { OrbitTierCapabilitySchema } from "./schemas/orbit-tier-capability.schema";
import { PendingSeekerTierSchema } from "./schemas/pending-seeker-tier.schema";
import { SalaryBenchmarkSchema } from "./schemas/salary-benchmark.schema";
import { SeekerApplyClickSchema } from "./schemas/seeker-apply-click.schema";
import { SeekerBillingEventSchema } from "./schemas/seeker-billing-event.schema";
import { SeekerEmploymentRecordSchema } from "./schemas/seeker-employment-record.schema";
import { SeekerInterviewEventSchema } from "./schemas/seeker-interview-event.schema";
import { SeekerInterviewReminderSchema } from "./schemas/seeker-interview-reminder.schema";
import { SeekerLaunchReadinessSnapshotSchema } from "./schemas/seeker-launch-readiness-snapshot.schema";
import { SeekerMuteSchema } from "./schemas/seeker-mute.schema";
import { SeekerTestEventSchema } from "./schemas/seeker-test-event.schema";
import { SeekerTestParticipantSchema } from "./schemas/seeker-test-participant.schema";
import { SeekerTestPhaseSchema } from "./schemas/seeker-test-phase.schema";
import { SeekerTestingIssueSchema } from "./schemas/seeker-testing-issue.schema";
import { SeekerUsageCounterSchema } from "./schemas/seeker-usage-counter.schema";
import { SeekerWorkflowProgressSchema } from "./schemas/seeker-workflow-progress.schema";
import { SeekerWorkflowStepSchema } from "./schemas/seeker-workflow-step.schema";
import { SourceRespectRankSchema } from "./schemas/source-respect-rank.schema";
import { AssistedPortalAdapters } from "./services/adapters/assisted-portal-adapters.service";
import { FacebookPortalAdapter } from "./services/adapters/facebook-portal-adapter.service";
import { GumtreePortalAdapter } from "./services/adapters/gumtree-portal-adapter.service";
import { IndeedPortalAdapter } from "./services/adapters/indeed-portal-adapter.service";
import { LinkedInPortalAdapter } from "./services/adapters/linkedin-portal-adapter.service";
import { AdminOrbitUserService } from "./services/admin-orbit-user.service";
import { AdzunaService } from "./services/adzuna.service";
import { AnalyticsService } from "./services/analytics.service";
import { AnnixOrbitAuditService } from "./services/annix-orbit-audit.service";
import { AnnixOrbitClientService } from "./services/annix-orbit-client.service";
import { AnnixOrbitComplianceItemService } from "./services/annix-orbit-compliance-item.service";
import { AnnixOrbitJobService } from "./services/annix-orbit-job.service";
import { AnnixOrbitMessageService } from "./services/annix-orbit-message.service";
import { AnnixOrbitPlacementService } from "./services/annix-orbit-placement.service";
import { AnnixOrbitRecruiterAssistantService } from "./services/annix-orbit-recruiter-assistant.service";
import { AnnixOrbitRecruiterInterviewService } from "./services/annix-orbit-recruiter-interview.service";
import { AnnixOrbitShortlistService } from "./services/annix-orbit-shortlist.service";
import { AnnixOrbitShortlistDeliveryService } from "./services/annix-orbit-shortlist-delivery.service";
import { AnnixOrbitSubmissionService } from "./services/annix-orbit-submission.service";
import { AnnixOrbitTalentCandidateService } from "./services/annix-orbit-talent-candidate.service";
import { AnnixOrbitTalentCredentialService } from "./services/annix-orbit-talent-credential.service";
import { AnnixOrbitTalentPoolService } from "./services/annix-orbit-talent-pool.service";
import { AnnixOrbitTaskService } from "./services/annix-orbit-task.service";
import { AnnixOrbitTeamService } from "./services/annix-orbit-team.service";
import { AnnixOrbitAuthService } from "./services/auth.service";
import { CandidateService } from "./services/candidate.service";
import { CandidateJobMatchingService } from "./services/candidate-job-matching.service";
import { CareerjetService } from "./services/careerjet.service";
import { SitemapCrawlIngestionService } from "./services/crawl/sitemap-crawl-ingestion.service";
import { CredentialService } from "./services/credential.service";
import { CredentialScanReminderService } from "./services/credential-scan-reminder.service";
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
import { InterviewReminderService } from "./services/interview-reminder.service";
import { JobCategorizationService } from "./services/job-categorization.service";
import { JobIngestionService } from "./services/job-ingestion.service";
import { JobMarketCountriesService } from "./services/job-market-countries.service";
import { JobMarketSourceService } from "./services/job-market-source.service";
import { JobMatchService } from "./services/job-match.service";
import { JobPostingService } from "./services/job-posting.service";
import { JobVettingService } from "./services/job-vetting.service";
import { JoobleService } from "./services/jooble.service";
import { MarketInsightsService } from "./services/market-insights.service";
import { NixCvPdfService } from "./services/nix-cv-pdf.service";
import { NixJobAssistService } from "./services/nix-job-assist.service";
import { NixSeekerAssistService } from "./services/nix-seeker-assist.service";
import { OrbitCredentialTypeService } from "./services/orbit-credential-type.service";
import { OrbitDismissReasonService } from "./services/orbit-dismiss-reason.service";
import { OrbitEarlyAccessService } from "./services/orbit-early-access.service";
import { OrbitJobDelistService } from "./services/orbit-job-delist.service";
import { OrbitOutreachService } from "./services/orbit-outreach.service";
import { OrbitTierCapabilityService } from "./services/orbit-tier-capability.service";
import { PaystackApiService } from "./services/paystack-api.service";
import { PopiaService } from "./services/popia.service";
import { PortalAdapterRegistry } from "./services/portal-adapter-registry.service";
import { PortalPostingOrchestrator } from "./services/portal-posting-orchestrator.service";
import { PortalPostingRetryService } from "./services/portal-posting-retry.service";
import { RecruiterDashboardService } from "./services/recruiter-dashboard.service";
import { ReferenceService } from "./services/reference.service";
import { RemotiveService } from "./services/remotive.service";
import { SalaryBenchmarkService } from "./services/salary-benchmark.service";
import { SeekerApplicationsService } from "./services/seeker-applications.service";
import { SeekerAssistantService } from "./services/seeker-assistant.service";
import { SeekerBillingService } from "./services/seeker-billing.service";
import { SeekerCalendarService } from "./services/seeker-calendar.service";
import { SeekerCompanyResearchService } from "./services/seeker-company-research.service";
import { SeekerEmploymentService } from "./services/seeker-employment.service";
import { SeekerInterviewEventsService } from "./services/seeker-interview-events.service";
import { SeekerJobFeedService } from "./services/seeker-job-feed.service";
import { SeekerLaunchReadinessService } from "./services/seeker-launch-readiness.service";
import { SeekerReminderPreferencesService } from "./services/seeker-reminder-preferences.service";
import { SeekerTelemetryService } from "./services/seeker-telemetry.service";
import { SeekerWorkflowProgressService } from "./services/seeker-workflow-progress.service";
import { SettingsService } from "./services/settings.service";
import { TestCandidateSeederService } from "./services/test-candidate-seeder.service";
import { WorkProfileService } from "./services/work-profile.service";
import { WorkflowAutomationService } from "./services/workflow-automation.service";

@Module({
  imports: [
    MongooseModule.forFeature(
      [
        { name: "JobPosting", schema: JobPostingSchema },
        { name: "Candidate", schema: CandidateSchema },
        { name: "CandidateReference", schema: CandidateReferenceSchema },
        { name: "JobMarketSource", schema: JobMarketSourceSchema },
        { name: "ExternalJob", schema: ExternalJobSchema },
        { name: "ExternalJobAlternate", schema: ExternalJobAlternateSchema },
        { name: "ExternalJobEmbedding", schema: ExternalJobEmbeddingSchema },
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
        { name: "SeekerEmploymentRecord", schema: SeekerEmploymentRecordSchema },
        { name: "SeekerInterviewEvent", schema: SeekerInterviewEventSchema },
        { name: "SeekerInterviewReminder", schema: SeekerInterviewReminderSchema },
        { name: "SeekerMute", schema: SeekerMuteSchema },
        { name: "SourceRespectRank", schema: SourceRespectRankSchema },
        { name: "CvCredential", schema: CvCredentialSchema },
        { name: "OrbitCredentialType", schema: OrbitCredentialTypeSchema },
        { name: "OrbitDismissReason", schema: OrbitDismissReasonSchema },
        { name: "OrbitEarlyAccessSignup", schema: OrbitEarlyAccessSignupSchema },
        { name: "OrbitOutreachAsset", schema: OrbitOutreachAssetSchema },
        { name: "OrbitOutreachSchedule", schema: OrbitOutreachScheduleSchema },
        { name: "OrbitTierCapability", schema: OrbitTierCapabilitySchema },
        { name: "SeekerUsageCounter", schema: SeekerUsageCounterSchema },
        { name: "CvEscoSkill", schema: CvEscoSkillSchema },
        { name: "CvGeocodeCache", schema: CvGeocodeCacheSchema },
        { name: "JobAnalysisCache", schema: JobAnalysisCacheSchema },
        { name: "AnnixOrbitProfile", schema: AnnixOrbitProfileSchema },
        { name: "AnnixOrbitClient", schema: AnnixOrbitClientSchema },
        { name: "AnnixOrbitPlacement", schema: AnnixOrbitPlacementSchema },
        { name: "AnnixOrbitTalentCandidate", schema: AnnixOrbitTalentCandidateSchema },
        {
          name: "AnnixOrbitTalentCredential",
          schema: AnnixOrbitTalentCredentialSchema,
        },
        { name: "AnnixOrbitTask", schema: AnnixOrbitTaskSchema },
        { name: "AnnixOrbitSubmission", schema: AnnixOrbitSubmissionSchema },
        { name: "SeekerTestPhase", schema: SeekerTestPhaseSchema },
        { name: "SeekerTestParticipant", schema: SeekerTestParticipantSchema },
        { name: "SeekerWorkflowProgress", schema: SeekerWorkflowProgressSchema },
        { name: "SeekerWorkflowStep", schema: SeekerWorkflowStepSchema },
        { name: "SeekerTestingIssue", schema: SeekerTestingIssueSchema },
        {
          name: "SeekerLaunchReadinessSnapshot",
          schema: SeekerLaunchReadinessSnapshotSchema,
        },
        { name: "SeekerTestEvent", schema: SeekerTestEventSchema },
        { name: "PendingSeekerTier", schema: PendingSeekerTierSchema },
        { name: "SeekerBillingEvent", schema: SeekerBillingEventSchema },
      ],
      ORBIT_CONNECTION,
    ),
    MongooseModule.forFeature([
      { name: "JobPosting", schema: JobPostingSchema },
      { name: "Candidate", schema: CandidateSchema },
      { name: "CandidateReference", schema: CandidateReferenceSchema },
      { name: "AnnixOrbitClient", schema: AnnixOrbitClientSchema },
      { name: "AnnixOrbitPlacement", schema: AnnixOrbitPlacementSchema },
      { name: "AnnixOrbitTalentCandidate", schema: AnnixOrbitTalentCandidateSchema },
      { name: "AnnixOrbitSubmission", schema: AnnixOrbitSubmissionSchema },
      { name: "AnnixOrbitTalentPool", schema: AnnixOrbitTalentPoolSchema },
      { name: "AnnixOrbitShortlist", schema: AnnixOrbitShortlistSchema },
      { name: "AnnixOrbitJob", schema: AnnixOrbitJobSchema },
      { name: "AnnixOrbitRecruiterInterview", schema: AnnixOrbitRecruiterInterviewSchema },
      { name: "AnnixOrbitAuditEvent", schema: AnnixOrbitAuditEventSchema },
      { name: "AnnixOrbitComplianceItem", schema: AnnixOrbitComplianceItemSchema },
      { name: "AnnixOrbitTeamInvite", schema: AnnixOrbitTeamInviteSchema },
      { name: "JobMarketSource", schema: JobMarketSourceSchema },
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
      { name: "OrbitTierCapability", schema: OrbitTierCapabilitySchema },
      { name: "SeekerUsageCounter", schema: SeekerUsageCounterSchema },
      { name: "CvEscoSkill", schema: CvEscoSkillSchema },
      { name: "CvGeocodeCache", schema: CvGeocodeCacheSchema },
      { name: "JobAnalysisCache", schema: JobAnalysisCacheSchema },
      { name: "AnnixOrbitProfile", schema: AnnixOrbitProfileSchema },
      { name: "User", schema: UserSchema },
      { name: "Company", schema: CompanySchema },
      { name: "App", schema: AppSchema },
      { name: "AppRole", schema: AppRoleSchema },
      { name: "UserAppAccess", schema: UserAppAccessSchema },
      { name: "Rfq", schema: RfqSchema },
      { name: "WhatsAppConversation", schema: WhatsAppConversationSchema },
      { name: "WhatsAppMessage", schema: WhatsAppMessageSchema },
    ]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: resolveAnnixOrbitJwtSecret(configService),
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
    FeedbackModule,
    EmailModule,
    StorageModule,
    AuditModule,
    AdminModule,
    FeatureFlagsModule,
    LicensingModule,
    WhatsAppModule,
  ],
  controllers: [
    AnnixOrbitAuthController,
    JobPostingController,
    CandidateController,
    ReferenceFeedbackController,
    DashboardController,
    SettingsController,
    ReferencesController,
    AnnixOrbitClientController,
    AnnixOrbitPlacementController,
    AnnixOrbitTalentCandidateController,
    AnnixOrbitTalentCredentialController,
    AnnixOrbitRecruiterAssistantController,
    SeekerAssistantController,
    RecruiterDashboardController,
    AnnixOrbitTaskController,
    AnnixOrbitSubmissionController,
    AnnixOrbitTalentPoolController,
    AnnixOrbitShortlistController,
    AnnixOrbitJobController,
    AnnixOrbitRecruiterInterviewController,
    AnnixOrbitAuditController,
    AnnixOrbitComplianceItemController,
    AnnixOrbitTeamController,
    AnnixOrbitMessageController,
    JobMarketController,
    AnalyticsController,
    NotificationController,
    IndividualProfileController,
    PortalAdaptersController,
    PublicOrbitShortlistController,
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
    AdminOrbitUsersController,
    SeekerJobsController,
    SeekerApplicationsController,
    SeekerCalendarController,
    PublicSeekerCalendarController,
    SeekerEmploymentController,
    SeekerInterviewEventsController,
    SeekerReminderPreferencesController,
    SeekerBillingController,
    PaystackWebhookController,
    WorkProfileController,
    CredentialController,
    AdminOrbitCredentialTypesController,
    AdminOrbitDismissReasonsController,
    AdminOrbitEarlyAccessController,
    AdminOrbitOutreachController,
    PublicEarlyAccessController,
    AdminOrbitDelistReportsController,
    AdminOrbitTierCapabilitiesController,
    PublicTierPlansController,
    AdminOrbitSeekerTestingController,
  ],
  providers: [
    AnnixOrbitAuthGuard,
    AnnixOrbitRoleGuard,
    AnnixOrbitAuthService,
    AdminOrbitUserService,
    CvAuditService,
    JobPostingService,
    CandidateService,
    CvExtractionService,
    LibreOfficeConversionService,
    JobMatchService,
    ReferenceService,
    AnnixOrbitClientService,
    AnnixOrbitPlacementService,
    AnnixOrbitTalentCandidateService,
    AnnixOrbitTalentCredentialService,
    AnnixOrbitRecruiterAssistantService,
    SeekerAssistantService,
    RecruiterDashboardService,
    AnnixOrbitTaskService,
    AnnixOrbitSubmissionService,
    AnnixOrbitTalentPoolService,
    AnnixOrbitShortlistService,
    AnnixOrbitShortlistDeliveryService,
    AnnixOrbitJobService,
    AnnixOrbitRecruiterInterviewService,
    AnnixOrbitAuditService,
    AnnixOrbitComplianceItemService,
    AnnixOrbitTeamService,
    AnnixOrbitMessageService,
    CvEmailAdapterService,
    CvScreeningService,
    EeDisclosureService,
    EeReportService,
    WorkflowAutomationService,
    SettingsService,
    AdzunaService,
    RemotiveService,
    CareerjetService,
    JoobleService,
    DpsaCircularService,
    SitemapCrawlIngestionService,
    JobIngestionService,
    JobCategorizationService,
    JobMarketCountriesService,
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
    AnnixOrbitLicensingRegistrar,
    AnnixOrbitRecruiterLicensingRegistrar,
    AnnixOrbitStudentLicensingRegistrar,
    SeekerJobFeedService,
    SeekerApplicationsService,
    SeekerCalendarService,
    SeekerCompanyResearchService,
    SeekerEmploymentService,
    SeekerInterviewEventsService,
    SeekerReminderPreferencesService,
    SeekerBillingService,
    PaystackApiService,
    PaystackConfigService,
    InterviewReminderService,
    CredentialScanReminderService,
    WorkProfileService,
    CredentialService,
    OrbitCredentialTypeService,
    OrbitDismissReasonService,
    OrbitEarlyAccessService,
    OrbitOutreachService,
    OrbitJobDelistService,
    OrbitTierCapabilityService,
    SeekerTelemetryService,
    SeekerWorkflowProgressService,
    SeekerLaunchReadinessService,
    repositoryProvider(CandidateRepository, MongoCandidateRepository),
    repositoryProvider(OrbitEarlyAccessSignupRepository, MongoOrbitEarlyAccessSignupRepository),
    repositoryProvider(OrbitOutreachAssetRepository, MongoOrbitOutreachAssetRepository),
    repositoryProvider(OrbitOutreachScheduleRepository, MongoOrbitOutreachScheduleRepository),
    repositoryProvider(SeekerTestPhaseRepository, MongoSeekerTestPhaseRepository),
    repositoryProvider(SeekerTestParticipantRepository, MongoSeekerTestParticipantRepository),
    repositoryProvider(SeekerWorkflowProgressRepository, MongoSeekerWorkflowProgressRepository),
    repositoryProvider(SeekerWorkflowStepRepository, MongoSeekerWorkflowStepRepository),
    repositoryProvider(SeekerTestingIssueRepository, MongoSeekerTestingIssueRepository),
    repositoryProvider(
      SeekerLaunchReadinessSnapshotRepository,
      MongoSeekerLaunchReadinessSnapshotRepository,
    ),
    repositoryProvider(SeekerTestEventRepository, MongoSeekerTestEventRepository),
    repositoryProvider(PendingSeekerTierRepository, MongoPendingSeekerTierRepository),
    repositoryProvider(JobPostingRepository, MongoJobPostingRepository),
    repositoryProvider(JobSkillRepository, MongoJobSkillRepository),
    repositoryProvider(JobSuccessMetricRepository, MongoJobSuccessMetricRepository),
    repositoryProvider(JobScreeningQuestionRepository, MongoJobScreeningQuestionRepository),
    repositoryProvider(CandidateReferenceRepository, MongoCandidateReferenceRepository),
    repositoryProvider(AnnixOrbitClientRepository, MongoAnnixOrbitClientRepository),
    repositoryProvider(AnnixOrbitPlacementRepository, MongoAnnixOrbitPlacementRepository),
    repositoryProvider(
      AnnixOrbitTalentCandidateRepository,
      MongoAnnixOrbitTalentCandidateRepository,
    ),
    repositoryProvider(
      AnnixOrbitTalentCredentialRepository,
      MongoAnnixOrbitTalentCredentialRepository,
    ),
    repositoryProvider(AnnixOrbitTaskRepository, MongoAnnixOrbitTaskRepository),
    repositoryProvider(AnnixOrbitSubmissionRepository, MongoAnnixOrbitSubmissionRepository),
    repositoryProvider(AnnixOrbitTalentPoolRepository, MongoAnnixOrbitTalentPoolRepository),
    repositoryProvider(AnnixOrbitShortlistRepository, MongoAnnixOrbitShortlistRepository),
    repositoryProvider(AnnixOrbitJobRepository, MongoAnnixOrbitJobRepository),
    repositoryProvider(
      AnnixOrbitRecruiterInterviewRepository,
      MongoAnnixOrbitRecruiterInterviewRepository,
    ),
    repositoryProvider(AnnixOrbitAuditEventRepository, MongoAnnixOrbitAuditEventRepository),
    repositoryProvider(AnnixOrbitComplianceItemRepository, MongoAnnixOrbitComplianceItemRepository),
    repositoryProvider(AnnixOrbitTeamInviteRepository, MongoAnnixOrbitTeamInviteRepository),
    repositoryProvider(ExternalJobRepository, MongoExternalJobRepository),
    repositoryProvider(ExternalJobAlternateRepository, MongoExternalJobAlternateRepository),
    repositoryProvider(CandidateJobMatchRepository, MongoCandidateJobMatchRepository),
    repositoryProvider(JobMarketSourceRepository, MongoJobMarketSourceRepository),
    repositoryProvider(JobPostingPortalPostingRepository, MongoJobPostingPortalPostingRepository),
    repositoryProvider(AnnixOrbitProfileRepository, MongoAnnixOrbitProfileRepository),
    repositoryProvider(AnnixOrbitUserRepository, MongoAnnixOrbitUserRepository),
    repositoryProvider(AnnixOrbitCompanyRepository, MongoAnnixOrbitCompanyRepository),
    repositoryProvider(
      AnnixOrbitIndividualDocumentRepository,
      MongoAnnixOrbitIndividualDocumentRepository,
    ),
    repositoryProvider(
      AnnixOrbitCandidateEeAttributesRepository,
      MongoAnnixOrbitCandidateEeAttributesRepository,
    ),
    repositoryProvider(
      AnnixOrbitEeConsentTextVersionRepository,
      MongoAnnixOrbitEeConsentTextVersionRepository,
    ),
    repositoryProvider(
      AnnixOrbitEeDisclosureInviteRepository,
      MongoAnnixOrbitEeDisclosureInviteRepository,
    ),
    repositoryProvider(
      AnnixOrbitEeSectoralTargetRepository,
      MongoAnnixOrbitEeSectoralTargetRepository,
    ),
    repositoryProvider(AnnixOrbitEmailTemplateRepository, MongoAnnixOrbitEmailTemplateRepository),
    repositoryProvider(InterviewSlotRepository, MongoInterviewSlotRepository),
    repositoryProvider(InterviewBookingRepository, MongoInterviewBookingRepository),
    repositoryProvider(InterviewInviteRepository, MongoInterviewInviteRepository),
    repositoryProvider(SalaryBenchmarkRepository, MongoSalaryBenchmarkRepository),
    repositoryProvider(SeekerApplyClickRepository, MongoSeekerApplyClickRepository),
    repositoryProvider(SeekerEmploymentRecordRepository, MongoSeekerEmploymentRecordRepository),
    repositoryProvider(SeekerInterviewEventRepository, MongoSeekerInterviewEventRepository),
    repositoryProvider(SeekerInterviewReminderRepository, MongoSeekerInterviewReminderRepository),
    repositoryProvider(SeekerMuteRepository, MongoSeekerMuteRepository),
    repositoryProvider(SourceRespectRankRepository, MongoSourceRespectRankRepository),
    repositoryProvider(CvCredentialRepository, MongoCvCredentialRepository),
    repositoryProvider(OrbitCredentialTypeRepository, MongoOrbitCredentialTypeRepository),
    repositoryProvider(OrbitDismissReasonRepository, MongoOrbitDismissReasonRepository),
    repositoryProvider(OrbitTierCapabilityRepository, MongoOrbitTierCapabilityRepository),
    repositoryProvider(SeekerUsageCounterRepository, MongoSeekerUsageCounterRepository),
    repositoryProvider(SeekerBillingEventRepository, MongoSeekerBillingEventRepository),
    repositoryProvider(CvEscoSkillRepository, MongoCvEscoSkillRepository),
    repositoryProvider(CvGeocodeCacheRepository, MongoCvGeocodeCacheRepository),
    repositoryProvider(JobAnalysisCacheRepository, MongoJobAnalysisCacheRepository),
    repositoryProvider(CvPushSubscriptionRepository, MongoCvPushSubscriptionRepository),
    repositoryProvider(UserRepository, MongoUserRepository),
    repositoryProvider(CompanyRepository, MongoCompanyRepository),
    repositoryProvider(AppRepository, MongoAppRepository),
    repositoryProvider(AppRoleRepository, MongoAppRoleRepository),
    repositoryProvider(UserAppAccessRepository, MongoUserAppAccessRepository),
    repositoryProvider(RfqRepository, MongoRfqRepository),
    repositoryProvider(WhatsAppConversationRepository, MongoWhatsAppConversationRepository),
    repositoryProvider(WhatsAppMessageRepository, MongoWhatsAppMessageRepository),
  ],
  exports: [AnnixOrbitAuthService],
})
export class AnnixOrbitModule {}

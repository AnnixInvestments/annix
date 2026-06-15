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
import { FeedbackModule } from "../feedback/feedback.module";
import { LibreOfficeConversionService } from "../lib/libreoffice-conversion.service";
import { isMongoDriver } from "../lib/persistence/database-driver";
import { ORBIT_CONNECTION } from "../lib/persistence/mongo-connections";
import { repositoryProvider } from "../lib/persistence/repository-provider";
import { LicensingModule } from "../licensing";
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
import { AnnixOrbitLicensingRegistrar } from "./annix-orbit-licensing.registrar";
import { AnnixOrbitRecruiterLicensingRegistrar } from "./annix-orbit-recruiter-licensing.registrar";
import { AnnixOrbitStudentLicensingRegistrar } from "./annix-orbit-student-licensing.registrar";
import { AnnixOrbitCapabilities } from "./capabilities/annix-orbit.capabilities";
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
import { SeekerCalendarController } from "./controllers/seeker-calendar.controller";
import { SeekerEmploymentController } from "./controllers/seeker-employment.controller";
import { SeekerInterviewEventsController } from "./controllers/seeker-interview-events.controller";
import { SeekerJobsController } from "./controllers/seeker-jobs.controller";
import { SeekerReminderPreferencesController } from "./controllers/seeker-reminder-preferences.controller";
import { SettingsController } from "./controllers/settings.controller";
import { WorkProfileController } from "./controllers/work-profile.controller";
import { AnnixOrbitAuditEvent } from "./entities/annix-orbit-audit-event.entity";
import { AnnixOrbitCandidateEeAttributes } from "./entities/annix-orbit-candidate-ee-attributes.entity";
import { AnnixOrbitClient } from "./entities/annix-orbit-client.entity";
import { AnnixOrbitCompany } from "./entities/annix-orbit-company.entity";
import { AnnixOrbitComplianceItem } from "./entities/annix-orbit-compliance-item.entity";
import { AnnixOrbitEeConsentTextVersion } from "./entities/annix-orbit-ee-consent-text-version.entity";
import { AnnixOrbitEeDisclosureInvite } from "./entities/annix-orbit-ee-disclosure-invite.entity";
import { AnnixOrbitEeSectoralTarget } from "./entities/annix-orbit-ee-sectoral-target.entity";
import { AnnixOrbitEmailTemplate } from "./entities/annix-orbit-email-template.entity";
import { AnnixOrbitIndividualDocument } from "./entities/annix-orbit-individual-document.entity";
import { AnnixOrbitJob } from "./entities/annix-orbit-job.entity";
import { AnnixOrbitPlacement } from "./entities/annix-orbit-placement.entity";
import { AnnixOrbitProfile } from "./entities/annix-orbit-profile.entity";
import { AnnixOrbitRecruiterInterview } from "./entities/annix-orbit-recruiter-interview.entity";
import { AnnixOrbitShortlist } from "./entities/annix-orbit-shortlist.entity";
import { AnnixOrbitSubmission } from "./entities/annix-orbit-submission.entity";
import { AnnixOrbitTalentCandidate } from "./entities/annix-orbit-talent-candidate.entity";
import { AnnixOrbitTalentCredential } from "./entities/annix-orbit-talent-credential.entity";
import { AnnixOrbitTalentPool } from "./entities/annix-orbit-talent-pool.entity";
import { AnnixOrbitTask } from "./entities/annix-orbit-task.entity";
import { AnnixOrbitTeamInvite } from "./entities/annix-orbit-team-invite.entity";
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
import { OrbitDismissReason } from "./entities/orbit-dismiss-reason.entity";
import { OrbitEarlyAccessSignup } from "./entities/orbit-early-access-signup.entity";
import { OrbitOutreachAsset } from "./entities/orbit-outreach-asset.entity";
import { OrbitOutreachSchedule } from "./entities/orbit-outreach-schedule.entity";
import { OrbitTierCapability } from "./entities/orbit-tier-capability.entity";
import { PendingSeekerTier } from "./entities/pending-seeker-tier.entity";
import { SalaryBenchmark } from "./entities/salary-benchmark.entity";
import { SeekerApplyClick } from "./entities/seeker-apply-click.entity";
import { SeekerEmploymentRecord } from "./entities/seeker-employment-record.entity";
import { SeekerInterviewEvent } from "./entities/seeker-interview-event.entity";
import { SeekerInterviewReminder } from "./entities/seeker-interview-reminder.entity";
import { SeekerLaunchReadinessSnapshot } from "./entities/seeker-launch-readiness-snapshot.entity";
import { SeekerMute } from "./entities/seeker-mute.entity";
import { SeekerTestEvent } from "./entities/seeker-test-event.entity";
import { SeekerTestParticipant } from "./entities/seeker-test-participant.entity";
import { SeekerTestPhase } from "./entities/seeker-test-phase.entity";
import { SeekerTestingIssue } from "./entities/seeker-testing-issue.entity";
import { SeekerUsageCounter } from "./entities/seeker-usage-counter.entity";
import { SeekerWorkflowProgress } from "./entities/seeker-workflow-progress.entity";
import { SeekerWorkflowStep } from "./entities/seeker-workflow-step.entity";
import { SourceRespectRank } from "./entities/source-respect-rank.entity";
import { AnnixOrbitAuthGuard } from "./guards/annix-orbit-auth.guard";
import { AnnixOrbitRoleGuard } from "./guards/annix-orbit-role.guard";
import { AnnixOrbitAuditEventRepository } from "./repositories/annix-orbit-audit-event.repository";
import { MongoAnnixOrbitAuditEventRepository } from "./repositories/annix-orbit-audit-event.repository.mongo";
import { PostgresAnnixOrbitAuditEventRepository } from "./repositories/annix-orbit-audit-event.repository.postgres";
import { AnnixOrbitCandidateEeAttributesRepository } from "./repositories/annix-orbit-candidate-ee-attributes.repository";
import { MongoAnnixOrbitCandidateEeAttributesRepository } from "./repositories/annix-orbit-candidate-ee-attributes.repository.mongo";
import { PostgresAnnixOrbitCandidateEeAttributesRepository } from "./repositories/annix-orbit-candidate-ee-attributes.repository.postgres";
import { AnnixOrbitClientRepository } from "./repositories/annix-orbit-client.repository";
import { MongoAnnixOrbitClientRepository } from "./repositories/annix-orbit-client.repository.mongo";
import { PostgresAnnixOrbitClientRepository } from "./repositories/annix-orbit-client.repository.postgres";
import { AnnixOrbitCompanyRepository } from "./repositories/annix-orbit-company.repository";
import { MongoAnnixOrbitCompanyRepository } from "./repositories/annix-orbit-company.repository.mongo";
import { PostgresAnnixOrbitCompanyRepository } from "./repositories/annix-orbit-company.repository.postgres";
import { AnnixOrbitComplianceItemRepository } from "./repositories/annix-orbit-compliance-item.repository";
import { MongoAnnixOrbitComplianceItemRepository } from "./repositories/annix-orbit-compliance-item.repository.mongo";
import { PostgresAnnixOrbitComplianceItemRepository } from "./repositories/annix-orbit-compliance-item.repository.postgres";
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
import { AnnixOrbitJobRepository } from "./repositories/annix-orbit-job.repository";
import { MongoAnnixOrbitJobRepository } from "./repositories/annix-orbit-job.repository.mongo";
import { PostgresAnnixOrbitJobRepository } from "./repositories/annix-orbit-job.repository.postgres";
import { AnnixOrbitPlacementRepository } from "./repositories/annix-orbit-placement.repository";
import { MongoAnnixOrbitPlacementRepository } from "./repositories/annix-orbit-placement.repository.mongo";
import { PostgresAnnixOrbitPlacementRepository } from "./repositories/annix-orbit-placement.repository.postgres";
import { AnnixOrbitProfileRepository } from "./repositories/annix-orbit-profile.repository";
import { MongoAnnixOrbitProfileRepository } from "./repositories/annix-orbit-profile.repository.mongo";
import { PostgresAnnixOrbitProfileRepository } from "./repositories/annix-orbit-profile.repository.postgres";
import { AnnixOrbitRecruiterInterviewRepository } from "./repositories/annix-orbit-recruiter-interview.repository";
import { MongoAnnixOrbitRecruiterInterviewRepository } from "./repositories/annix-orbit-recruiter-interview.repository.mongo";
import { PostgresAnnixOrbitRecruiterInterviewRepository } from "./repositories/annix-orbit-recruiter-interview.repository.postgres";
import { AnnixOrbitShortlistRepository } from "./repositories/annix-orbit-shortlist.repository";
import { MongoAnnixOrbitShortlistRepository } from "./repositories/annix-orbit-shortlist.repository.mongo";
import { PostgresAnnixOrbitShortlistRepository } from "./repositories/annix-orbit-shortlist.repository.postgres";
import { AnnixOrbitSubmissionRepository } from "./repositories/annix-orbit-submission.repository";
import { MongoAnnixOrbitSubmissionRepository } from "./repositories/annix-orbit-submission.repository.mongo";
import { PostgresAnnixOrbitSubmissionRepository } from "./repositories/annix-orbit-submission.repository.postgres";
import { AnnixOrbitTalentCandidateRepository } from "./repositories/annix-orbit-talent-candidate.repository";
import { MongoAnnixOrbitTalentCandidateRepository } from "./repositories/annix-orbit-talent-candidate.repository.mongo";
import { PostgresAnnixOrbitTalentCandidateRepository } from "./repositories/annix-orbit-talent-candidate.repository.postgres";
import { AnnixOrbitTalentCredentialRepository } from "./repositories/annix-orbit-talent-credential.repository";
import { MongoAnnixOrbitTalentCredentialRepository } from "./repositories/annix-orbit-talent-credential.repository.mongo";
import { PostgresAnnixOrbitTalentCredentialRepository } from "./repositories/annix-orbit-talent-credential.repository.postgres";
import { AnnixOrbitTalentPoolRepository } from "./repositories/annix-orbit-talent-pool.repository";
import { MongoAnnixOrbitTalentPoolRepository } from "./repositories/annix-orbit-talent-pool.repository.mongo";
import { PostgresAnnixOrbitTalentPoolRepository } from "./repositories/annix-orbit-talent-pool.repository.postgres";
import { AnnixOrbitTaskRepository } from "./repositories/annix-orbit-task.repository";
import { MongoAnnixOrbitTaskRepository } from "./repositories/annix-orbit-task.repository.mongo";
import { PostgresAnnixOrbitTaskRepository } from "./repositories/annix-orbit-task.repository.postgres";
import { AnnixOrbitTeamInviteRepository } from "./repositories/annix-orbit-team-invite.repository";
import { MongoAnnixOrbitTeamInviteRepository } from "./repositories/annix-orbit-team-invite.repository.mongo";
import { PostgresAnnixOrbitTeamInviteRepository } from "./repositories/annix-orbit-team-invite.repository.postgres";
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
import { OrbitDismissReasonRepository } from "./repositories/orbit-dismiss-reason.repository";
import { MongoOrbitDismissReasonRepository } from "./repositories/orbit-dismiss-reason.repository.mongo";
import { PostgresOrbitDismissReasonRepository } from "./repositories/orbit-dismiss-reason.repository.postgres";
import { OrbitEarlyAccessSignupRepository } from "./repositories/orbit-early-access-signup.repository";
import { MongoOrbitEarlyAccessSignupRepository } from "./repositories/orbit-early-access-signup.repository.mongo";
import { PostgresOrbitEarlyAccessSignupRepository } from "./repositories/orbit-early-access-signup.repository.postgres";
import { OrbitOutreachAssetRepository } from "./repositories/orbit-outreach-asset.repository";
import { MongoOrbitOutreachAssetRepository } from "./repositories/orbit-outreach-asset.repository.mongo";
import { PostgresOrbitOutreachAssetRepository } from "./repositories/orbit-outreach-asset.repository.postgres";
import { OrbitOutreachScheduleRepository } from "./repositories/orbit-outreach-schedule.repository";
import { MongoOrbitOutreachScheduleRepository } from "./repositories/orbit-outreach-schedule.repository.mongo";
import { PostgresOrbitOutreachScheduleRepository } from "./repositories/orbit-outreach-schedule.repository.postgres";
import { OrbitTierCapabilityRepository } from "./repositories/orbit-tier-capability.repository";
import { MongoOrbitTierCapabilityRepository } from "./repositories/orbit-tier-capability.repository.mongo";
import { PostgresOrbitTierCapabilityRepository } from "./repositories/orbit-tier-capability.repository.postgres";
import { PendingSeekerTierRepository } from "./repositories/pending-seeker-tier.repository";
import { MongoPendingSeekerTierRepository } from "./repositories/pending-seeker-tier.repository.mongo";
import { PostgresPendingSeekerTierRepository } from "./repositories/pending-seeker-tier.repository.postgres";
import { SalaryBenchmarkRepository } from "./repositories/salary-benchmark.repository";
import { MongoSalaryBenchmarkRepository } from "./repositories/salary-benchmark.repository.mongo";
import { PostgresSalaryBenchmarkRepository } from "./repositories/salary-benchmark.repository.postgres";
import { SeekerApplyClickRepository } from "./repositories/seeker-apply-click.repository";
import { MongoSeekerApplyClickRepository } from "./repositories/seeker-apply-click.repository.mongo";
import { PostgresSeekerApplyClickRepository } from "./repositories/seeker-apply-click.repository.postgres";
import { SeekerEmploymentRecordRepository } from "./repositories/seeker-employment-record.repository";
import { MongoSeekerEmploymentRecordRepository } from "./repositories/seeker-employment-record.repository.mongo";
import { PostgresSeekerEmploymentRecordRepository } from "./repositories/seeker-employment-record.repository.postgres";
import { SeekerInterviewEventRepository } from "./repositories/seeker-interview-event.repository";
import { MongoSeekerInterviewEventRepository } from "./repositories/seeker-interview-event.repository.mongo";
import { PostgresSeekerInterviewEventRepository } from "./repositories/seeker-interview-event.repository.postgres";
import { SeekerInterviewReminderRepository } from "./repositories/seeker-interview-reminder.repository";
import { MongoSeekerInterviewReminderRepository } from "./repositories/seeker-interview-reminder.repository.mongo";
import { PostgresSeekerInterviewReminderRepository } from "./repositories/seeker-interview-reminder.repository.postgres";
import { SeekerLaunchReadinessSnapshotRepository } from "./repositories/seeker-launch-readiness-snapshot.repository";
import { MongoSeekerLaunchReadinessSnapshotRepository } from "./repositories/seeker-launch-readiness-snapshot.repository.mongo";
import { PostgresSeekerLaunchReadinessSnapshotRepository } from "./repositories/seeker-launch-readiness-snapshot.repository.postgres";
import { SeekerMuteRepository } from "./repositories/seeker-mute.repository";
import { MongoSeekerMuteRepository } from "./repositories/seeker-mute.repository.mongo";
import { PostgresSeekerMuteRepository } from "./repositories/seeker-mute.repository.postgres";
import { SeekerTestEventRepository } from "./repositories/seeker-test-event.repository";
import { MongoSeekerTestEventRepository } from "./repositories/seeker-test-event.repository.mongo";
import { PostgresSeekerTestEventRepository } from "./repositories/seeker-test-event.repository.postgres";
import { SeekerTestParticipantRepository } from "./repositories/seeker-test-participant.repository";
import { MongoSeekerTestParticipantRepository } from "./repositories/seeker-test-participant.repository.mongo";
import { PostgresSeekerTestParticipantRepository } from "./repositories/seeker-test-participant.repository.postgres";
import { SeekerTestPhaseRepository } from "./repositories/seeker-test-phase.repository";
import { MongoSeekerTestPhaseRepository } from "./repositories/seeker-test-phase.repository.mongo";
import { PostgresSeekerTestPhaseRepository } from "./repositories/seeker-test-phase.repository.postgres";
import { SeekerTestingIssueRepository } from "./repositories/seeker-testing-issue.repository";
import { MongoSeekerTestingIssueRepository } from "./repositories/seeker-testing-issue.repository.mongo";
import { PostgresSeekerTestingIssueRepository } from "./repositories/seeker-testing-issue.repository.postgres";
import { SeekerUsageCounterRepository } from "./repositories/seeker-usage-counter.repository";
import { MongoSeekerUsageCounterRepository } from "./repositories/seeker-usage-counter.repository.mongo";
import { PostgresSeekerUsageCounterRepository } from "./repositories/seeker-usage-counter.repository.postgres";
import { SeekerWorkflowProgressRepository } from "./repositories/seeker-workflow-progress.repository";
import { MongoSeekerWorkflowProgressRepository } from "./repositories/seeker-workflow-progress.repository.mongo";
import { PostgresSeekerWorkflowProgressRepository } from "./repositories/seeker-workflow-progress.repository.postgres";
import { SeekerWorkflowStepRepository } from "./repositories/seeker-workflow-step.repository";
import { MongoSeekerWorkflowStepRepository } from "./repositories/seeker-workflow-step.repository.mongo";
import { PostgresSeekerWorkflowStepRepository } from "./repositories/seeker-workflow-step.repository.postgres";
import { SourceRespectRankRepository } from "./repositories/source-respect-rank.repository";
import { MongoSourceRespectRankRepository } from "./repositories/source-respect-rank.repository.mongo";
import { PostgresSourceRespectRankRepository } from "./repositories/source-respect-rank.repository.postgres";
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
import { OrbitDismissReasonSchema } from "./schemas/orbit-dismiss-reason.schema";
import { OrbitEarlyAccessSignupSchema } from "./schemas/orbit-early-access-signup.schema";
import { OrbitOutreachAssetSchema } from "./schemas/orbit-outreach-asset.schema";
import { OrbitOutreachScheduleSchema } from "./schemas/orbit-outreach-schedule.schema";
import { OrbitTierCapabilitySchema } from "./schemas/orbit-tier-capability.schema";
import { PendingSeekerTierSchema } from "./schemas/pending-seeker-tier.schema";
import { SalaryBenchmarkSchema } from "./schemas/salary-benchmark.schema";
import { SeekerApplyClickSchema } from "./schemas/seeker-apply-click.schema";
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
    ...(isMongoDriver()
      ? [
          MongooseModule.forFeature(
            [
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
            { name: "OrbitTierCapability", schema: OrbitTierCapabilitySchema },
            { name: "SeekerUsageCounter", schema: SeekerUsageCounterSchema },
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
            AnnixOrbitClient,
            AnnixOrbitPlacement,
            AnnixOrbitTalentCandidate,
            AnnixOrbitTalentCredential,
            AnnixOrbitTask,
            AnnixOrbitSubmission,
            AnnixOrbitTalentPool,
            AnnixOrbitShortlist,
            AnnixOrbitJob,
            AnnixOrbitRecruiterInterview,
            AnnixOrbitAuditEvent,
            AnnixOrbitComplianceItem,
            AnnixOrbitTeamInvite,
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
            SeekerEmploymentRecord,
            SeekerInterviewEvent,
            SeekerInterviewReminder,
            SeekerMute,
            SourceRespectRank,
            CvCredential,
            OrbitCredentialType,
            OrbitDismissReason,
            OrbitEarlyAccessSignup,
            OrbitOutreachAsset,
            OrbitOutreachSchedule,
            OrbitTierCapability,
            SeekerUsageCounter,
            CvEscoSkill,
            CvGeocodeCache,
            SeekerTestPhase,
            SeekerTestParticipant,
            SeekerWorkflowProgress,
            SeekerWorkflowStep,
            SeekerTestingIssue,
            SeekerLaunchReadinessSnapshot,
            SeekerTestEvent,
            PendingSeekerTier,
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
    FeedbackModule,
    EmailModule,
    StorageModule,
    AuditModule,
    AdminModule,
    FeatureFlagsModule,
    LicensingModule,
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
    repositoryProvider(CandidateRepository, PostgresCandidateRepository, MongoCandidateRepository),
    repositoryProvider(
      OrbitEarlyAccessSignupRepository,
      PostgresOrbitEarlyAccessSignupRepository,
      MongoOrbitEarlyAccessSignupRepository,
    ),
    repositoryProvider(
      OrbitOutreachAssetRepository,
      PostgresOrbitOutreachAssetRepository,
      MongoOrbitOutreachAssetRepository,
    ),
    repositoryProvider(
      OrbitOutreachScheduleRepository,
      PostgresOrbitOutreachScheduleRepository,
      MongoOrbitOutreachScheduleRepository,
    ),
    repositoryProvider(
      SeekerTestPhaseRepository,
      PostgresSeekerTestPhaseRepository,
      MongoSeekerTestPhaseRepository,
    ),
    repositoryProvider(
      SeekerTestParticipantRepository,
      PostgresSeekerTestParticipantRepository,
      MongoSeekerTestParticipantRepository,
    ),
    repositoryProvider(
      SeekerWorkflowProgressRepository,
      PostgresSeekerWorkflowProgressRepository,
      MongoSeekerWorkflowProgressRepository,
    ),
    repositoryProvider(
      SeekerWorkflowStepRepository,
      PostgresSeekerWorkflowStepRepository,
      MongoSeekerWorkflowStepRepository,
    ),
    repositoryProvider(
      SeekerTestingIssueRepository,
      PostgresSeekerTestingIssueRepository,
      MongoSeekerTestingIssueRepository,
    ),
    repositoryProvider(
      SeekerLaunchReadinessSnapshotRepository,
      PostgresSeekerLaunchReadinessSnapshotRepository,
      MongoSeekerLaunchReadinessSnapshotRepository,
    ),
    repositoryProvider(
      SeekerTestEventRepository,
      PostgresSeekerTestEventRepository,
      MongoSeekerTestEventRepository,
    ),
    repositoryProvider(
      PendingSeekerTierRepository,
      PostgresPendingSeekerTierRepository,
      MongoPendingSeekerTierRepository,
    ),
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
      AnnixOrbitClientRepository,
      PostgresAnnixOrbitClientRepository,
      MongoAnnixOrbitClientRepository,
    ),
    repositoryProvider(
      AnnixOrbitPlacementRepository,
      PostgresAnnixOrbitPlacementRepository,
      MongoAnnixOrbitPlacementRepository,
    ),
    repositoryProvider(
      AnnixOrbitTalentCandidateRepository,
      PostgresAnnixOrbitTalentCandidateRepository,
      MongoAnnixOrbitTalentCandidateRepository,
    ),
    repositoryProvider(
      AnnixOrbitTalentCredentialRepository,
      PostgresAnnixOrbitTalentCredentialRepository,
      MongoAnnixOrbitTalentCredentialRepository,
    ),
    repositoryProvider(
      AnnixOrbitTaskRepository,
      PostgresAnnixOrbitTaskRepository,
      MongoAnnixOrbitTaskRepository,
    ),
    repositoryProvider(
      AnnixOrbitSubmissionRepository,
      PostgresAnnixOrbitSubmissionRepository,
      MongoAnnixOrbitSubmissionRepository,
    ),
    repositoryProvider(
      AnnixOrbitTalentPoolRepository,
      PostgresAnnixOrbitTalentPoolRepository,
      MongoAnnixOrbitTalentPoolRepository,
    ),
    repositoryProvider(
      AnnixOrbitShortlistRepository,
      PostgresAnnixOrbitShortlistRepository,
      MongoAnnixOrbitShortlistRepository,
    ),
    repositoryProvider(
      AnnixOrbitJobRepository,
      PostgresAnnixOrbitJobRepository,
      MongoAnnixOrbitJobRepository,
    ),
    repositoryProvider(
      AnnixOrbitRecruiterInterviewRepository,
      PostgresAnnixOrbitRecruiterInterviewRepository,
      MongoAnnixOrbitRecruiterInterviewRepository,
    ),
    repositoryProvider(
      AnnixOrbitAuditEventRepository,
      PostgresAnnixOrbitAuditEventRepository,
      MongoAnnixOrbitAuditEventRepository,
    ),
    repositoryProvider(
      AnnixOrbitComplianceItemRepository,
      PostgresAnnixOrbitComplianceItemRepository,
      MongoAnnixOrbitComplianceItemRepository,
    ),
    repositoryProvider(
      AnnixOrbitTeamInviteRepository,
      PostgresAnnixOrbitTeamInviteRepository,
      MongoAnnixOrbitTeamInviteRepository,
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
      SeekerEmploymentRecordRepository,
      PostgresSeekerEmploymentRecordRepository,
      MongoSeekerEmploymentRecordRepository,
    ),
    repositoryProvider(
      SeekerInterviewEventRepository,
      PostgresSeekerInterviewEventRepository,
      MongoSeekerInterviewEventRepository,
    ),
    repositoryProvider(
      SeekerInterviewReminderRepository,
      PostgresSeekerInterviewReminderRepository,
      MongoSeekerInterviewReminderRepository,
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
      OrbitDismissReasonRepository,
      PostgresOrbitDismissReasonRepository,
      MongoOrbitDismissReasonRepository,
    ),
    repositoryProvider(
      OrbitTierCapabilityRepository,
      PostgresOrbitTierCapabilityRepository,
      MongoOrbitTierCapabilityRepository,
    ),
    repositoryProvider(
      SeekerUsageCounterRepository,
      PostgresSeekerUsageCounterRepository,
      MongoSeekerUsageCounterRepository,
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

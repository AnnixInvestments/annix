import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { MongooseModule } from "@nestjs/mongoose";
import { resolveAnnixOrbitJwtSecret } from "../annix-orbit/annix-orbit.constants";
import { AnnixOrbitAuthGuard } from "../annix-orbit/guards/annix-orbit-auth.guard";
import { AnnixOrbitEeConsentTextVersionRepository } from "../annix-orbit/repositories/annix-orbit-ee-consent-text-version.repository";
import { MongoAnnixOrbitEeConsentTextVersionRepository } from "../annix-orbit/repositories/annix-orbit-ee-consent-text-version.repository.mongo";
import { AnnixOrbitProfileRepository } from "../annix-orbit/repositories/annix-orbit-profile.repository";
import { MongoAnnixOrbitProfileRepository } from "../annix-orbit/repositories/annix-orbit-profile.repository.mongo";
import { CandidateRepository } from "../annix-orbit/repositories/candidate.repository";
import { MongoCandidateRepository } from "../annix-orbit/repositories/candidate.repository.mongo";
import { AnnixOrbitEeConsentTextVersionSchema } from "../annix-orbit/schemas/annix-orbit-ee-consent-text-version.schema";
import { AnnixOrbitProfileSchema } from "../annix-orbit/schemas/annix-orbit-profile.schema";
import { CandidateSchema } from "../annix-orbit/schemas/candidate.schema";
import { ORBIT_CONNECTION } from "../lib/persistence/mongo-connections";
import { repositoryProvider } from "../lib/persistence/repository-provider";
import { MetricsModule } from "../metrics/metrics.module";
import { NixModule } from "../nix/nix.module";
import { CompanySchema } from "../platform/schemas/company.schema";
import { UserAppAccessRepository } from "../rbac/rbac.repository";
import { MongoUserAppAccessRepository } from "../rbac/rbac.repository.mongo";
import { UserAppAccessSchema } from "../rbac/schemas/user-app-access.schema";
import { UserSchema } from "../user/schemas/user.schema";
import { UserRepository } from "../user/user.repository";
import { MongoUserRepository } from "../user/user.repository.mongo";
import { AnnixOrbitEducationCapabilities } from "./capabilities/annix-orbit-education.capabilities";
import { EducationController } from "./controllers/education.controller";
import { EducationEmploymentBridgeController } from "./controllers/education-employment-bridge.controller";
import { EducationGuardianController } from "./controllers/education-guardian.controller";
import { EducationRequirementsController } from "./controllers/education-requirements.controller";
import { AcademicResultRepository } from "./repositories/academic-result.repository";
import { MongoAcademicResultRepository } from "./repositories/academic-result.repository.mongo";
import { EducationAiAdviceLogRepository } from "./repositories/education-ai-advice-log.repository";
import { MongoEducationAiAdviceLogRepository } from "./repositories/education-ai-advice-log.repository.mongo";
import { EducationApplicationRepository } from "./repositories/education-application.repository";
import { MongoEducationApplicationRepository } from "./repositories/education-application.repository.mongo";
import { EducationConsentRepository } from "./repositories/education-consent.repository";
import { MongoEducationConsentRepository } from "./repositories/education-consent.repository.mongo";
import { EducationFacultyRepository } from "./repositories/education-faculty.repository";
import { MongoEducationFacultyRepository } from "./repositories/education-faculty.repository.mongo";
import { EducationInstitutionRepository } from "./repositories/education-institution.repository";
import { MongoEducationInstitutionRepository } from "./repositories/education-institution.repository.mongo";
import { EducationProfileRepository } from "./repositories/education-profile.repository";
import { MongoEducationProfileRepository } from "./repositories/education-profile.repository.mongo";
import { EducationProgrammeRepository } from "./repositories/education-programme.repository";
import { MongoEducationProgrammeRepository } from "./repositories/education-programme.repository.mongo";
import { EducationProgrammeOutcomeSignalRepository } from "./repositories/education-programme-outcome-signal.repository";
import { MongoEducationProgrammeOutcomeSignalRepository } from "./repositories/education-programme-outcome-signal.repository.mongo";
import { EducationRecommendationSnapshotRepository } from "./repositories/education-recommendation-snapshot.repository";
import { MongoEducationRecommendationSnapshotRepository } from "./repositories/education-recommendation-snapshot.repository.mongo";
import { EducationRequirementDraftRepository } from "./repositories/education-requirement-draft.repository";
import { MongoEducationRequirementDraftRepository } from "./repositories/education-requirement-draft.repository.mongo";
import { EducationRequirementVersionRepository } from "./repositories/education-requirement-version.repository";
import { MongoEducationRequirementVersionRepository } from "./repositories/education-requirement-version.repository.mongo";
import { EducationScholarshipRepository } from "./repositories/education-scholarship.repository";
import { MongoEducationScholarshipRepository } from "./repositories/education-scholarship.repository.mongo";
import { GuardianLinkRepository } from "./repositories/guardian-link.repository";
import { MongoGuardianLinkRepository } from "./repositories/guardian-link.repository.mongo";
import { AcademicResultSchema } from "./schemas/academic-result.schema";
import { EducationAdmissionDistributionSchema } from "./schemas/education-admission-distribution.schema";
import { EducationAiAdviceLogSchema } from "./schemas/education-ai-advice-log.schema";
import { EducationApplicationSchema } from "./schemas/education-application.schema";
import { EducationConsentSchema } from "./schemas/education-consent.schema";
import { EducationFacultySchema } from "./schemas/education-faculty.schema";
import { EducationInstitutionSchema } from "./schemas/education-institution.schema";
import { EducationProfileSchema } from "./schemas/education-profile.schema";
import { EducationProgrammeSchema } from "./schemas/education-programme.schema";
import { EducationProgrammeOutcomeSignalSchema } from "./schemas/education-programme-outcome-signal.schema";
import { EducationRecommendationSnapshotSchema } from "./schemas/education-recommendation-snapshot.schema";
import { EducationRequirementDraftSchema } from "./schemas/education-requirement-draft.schema";
import { EducationRequirementVersionSchema } from "./schemas/education-requirement-version.schema";
import { EducationScholarshipSchema } from "./schemas/education-scholarship.schema";
import { GuardianLinkSchema } from "./schemas/guardian-link.schema";
import { EducationApplicationService } from "./services/education-application.service";
import { EducationCareerFitService } from "./services/education-career-fit.service";
import { EducationChoiceAidService } from "./services/education-choice-aid.service";
import { EducationConsentService } from "./services/education-consent.service";
import { EducationEmploymentBridgeService } from "./services/education-employment-bridge.service";
import { EducationGuardianService } from "./services/education-guardian.service";
import { EducationMentorService } from "./services/education-mentor.service";
import { EducationProfileService } from "./services/education-profile.service";
import { EducationRecommendationService } from "./services/education-recommendation.service";
import { EducationRequirementsReadService } from "./services/education-requirements-read.service";
import { EducationScholarshipService } from "./services/education-scholarship.service";
import { GuardianLinkService } from "./services/guardian-link.service";

@Module({
  imports: [
    MongooseModule.forFeature(
      [
        { name: "EducationProfile", schema: EducationProfileSchema },
        { name: "AcademicResult", schema: AcademicResultSchema },
        { name: "GuardianLink", schema: GuardianLinkSchema },
        { name: "EducationConsent", schema: EducationConsentSchema },
        { name: "EducationAiAdviceLog", schema: EducationAiAdviceLogSchema },
        { name: "EducationInstitution", schema: EducationInstitutionSchema },
        { name: "EducationFaculty", schema: EducationFacultySchema },
        { name: "EducationProgramme", schema: EducationProgrammeSchema },
        {
          name: "EducationRequirementVersion",
          schema: EducationRequirementVersionSchema,
        },
        {
          name: "EducationRequirementDraft",
          schema: EducationRequirementDraftSchema,
        },
        {
          name: "EducationAdmissionDistribution",
          schema: EducationAdmissionDistributionSchema,
        },
        {
          name: "EducationRecommendationSnapshot",
          schema: EducationRecommendationSnapshotSchema,
        },
        { name: "EducationApplication", schema: EducationApplicationSchema },
        { name: "EducationScholarship", schema: EducationScholarshipSchema },
        {
          name: "EducationProgrammeOutcomeSignal",
          schema: EducationProgrammeOutcomeSignalSchema,
        },
        {
          name: "AnnixOrbitEeConsentTextVersion",
          schema: AnnixOrbitEeConsentTextVersionSchema,
        },
        { name: "AnnixOrbitProfile", schema: AnnixOrbitProfileSchema },
        { name: "Candidate", schema: CandidateSchema },
      ],
      ORBIT_CONNECTION,
    ),
    MongooseModule.forFeature([
      { name: "User", schema: UserSchema },
      { name: "UserAppAccess", schema: UserAppAccessSchema },
      { name: "Company", schema: CompanySchema },
    ]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: resolveAnnixOrbitJwtSecret(configService),
        signOptions: { expiresIn: "8h" },
      }),
    }),
    NixModule,
    MetricsModule,
  ],
  controllers: [
    EducationController,
    EducationGuardianController,
    EducationRequirementsController,
    EducationEmploymentBridgeController,
  ],
  providers: [
    AnnixOrbitAuthGuard,
    EducationRequirementsReadService,
    EducationEmploymentBridgeService,
    EducationConsentService,
    EducationProfileService,
    GuardianLinkService,
    EducationMentorService,
    EducationRecommendationService,
    EducationChoiceAidService,
    EducationApplicationService,
    EducationScholarshipService,
    EducationCareerFitService,
    EducationGuardianService,
    AnnixOrbitEducationCapabilities,
    repositoryProvider(EducationProfileRepository, MongoEducationProfileRepository),
    repositoryProvider(AcademicResultRepository, MongoAcademicResultRepository),
    repositoryProvider(GuardianLinkRepository, MongoGuardianLinkRepository),
    repositoryProvider(EducationConsentRepository, MongoEducationConsentRepository),
    repositoryProvider(EducationAiAdviceLogRepository, MongoEducationAiAdviceLogRepository),
    repositoryProvider(EducationInstitutionRepository, MongoEducationInstitutionRepository),
    repositoryProvider(EducationFacultyRepository, MongoEducationFacultyRepository),
    repositoryProvider(EducationProgrammeRepository, MongoEducationProgrammeRepository),
    repositoryProvider(
      EducationRequirementVersionRepository,
      MongoEducationRequirementVersionRepository,
    ),
    repositoryProvider(
      EducationRequirementDraftRepository,
      MongoEducationRequirementDraftRepository,
    ),
    repositoryProvider(
      EducationRecommendationSnapshotRepository,
      MongoEducationRecommendationSnapshotRepository,
    ),
    repositoryProvider(EducationApplicationRepository, MongoEducationApplicationRepository),
    repositoryProvider(EducationScholarshipRepository, MongoEducationScholarshipRepository),
    repositoryProvider(
      EducationProgrammeOutcomeSignalRepository,
      MongoEducationProgrammeOutcomeSignalRepository,
    ),
    repositoryProvider(
      AnnixOrbitEeConsentTextVersionRepository,
      MongoAnnixOrbitEeConsentTextVersionRepository,
    ),
    repositoryProvider(AnnixOrbitProfileRepository, MongoAnnixOrbitProfileRepository),
    repositoryProvider(UserRepository, MongoUserRepository),
    repositoryProvider(UserAppAccessRepository, MongoUserAppAccessRepository),
    repositoryProvider(CandidateRepository, MongoCandidateRepository),
  ],
  exports: [
    EducationConsentService,
    EducationProfileService,
    EducationMentorService,
    EducationRecommendationService,
    EducationChoiceAidService,
  ],
})
export class AnnixOrbitEducationModule {}

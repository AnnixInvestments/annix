import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { MongooseModule } from "@nestjs/mongoose";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ANNIX_ORBIT_JWT_SECRET_DEFAULT } from "../annix-orbit/annix-orbit.constants";
import { AnnixOrbitEeConsentTextVersion } from "../annix-orbit/entities/annix-orbit-ee-consent-text-version.entity";
import { AnnixOrbitProfile } from "../annix-orbit/entities/annix-orbit-profile.entity";
import { AnnixOrbitAuthGuard } from "../annix-orbit/guards/annix-orbit-auth.guard";
import { AnnixOrbitEeConsentTextVersionRepository } from "../annix-orbit/repositories/annix-orbit-ee-consent-text-version.repository";
import { MongoAnnixOrbitEeConsentTextVersionRepository } from "../annix-orbit/repositories/annix-orbit-ee-consent-text-version.repository.mongo";
import { PostgresAnnixOrbitEeConsentTextVersionRepository } from "../annix-orbit/repositories/annix-orbit-ee-consent-text-version.repository.postgres";
import { AnnixOrbitProfileRepository } from "../annix-orbit/repositories/annix-orbit-profile.repository";
import { MongoAnnixOrbitProfileRepository } from "../annix-orbit/repositories/annix-orbit-profile.repository.mongo";
import { PostgresAnnixOrbitProfileRepository } from "../annix-orbit/repositories/annix-orbit-profile.repository.postgres";
import { AnnixOrbitEeConsentTextVersionSchema } from "../annix-orbit/schemas/annix-orbit-ee-consent-text-version.schema";
import { AnnixOrbitProfileSchema } from "../annix-orbit/schemas/annix-orbit-profile.schema";
import { isMongoDriver } from "../lib/persistence/database-driver";
import { repositoryProvider } from "../lib/persistence/repository-provider";
import { MetricsModule } from "../metrics/metrics.module";
import { NixModule } from "../nix/nix.module";
import { UserAppAccess } from "../rbac/entities/user-app-access.entity";
import { UserAppAccessRepository } from "../rbac/rbac.repository";
import { MongoUserAppAccessRepository } from "../rbac/rbac.repository.mongo";
import { PostgresUserAppAccessRepository } from "../rbac/rbac.repository.postgres";
import { UserAppAccessSchema } from "../rbac/schemas/user-app-access.schema";
import { User } from "../user/entities/user.entity";
import { UserSchema } from "../user/schemas/user.schema";
import { UserRepository } from "../user/user.repository";
import { MongoUserRepository } from "../user/user.repository.mongo";
import { PostgresUserRepository } from "../user/user.repository.postgres";
import { AnnixOrbitEducationCapabilities } from "./capabilities/annix-orbit-education.capabilities";
import { EducationController } from "./controllers/education.controller";
import { EducationEmploymentBridgeController } from "./controllers/education-employment-bridge.controller";
import { EducationGuardianController } from "./controllers/education-guardian.controller";
import { EducationRequirementsController } from "./controllers/education-requirements.controller";
import { AcademicResult } from "./entities/academic-result.entity";
import { EducationAdmissionDistribution } from "./entities/education-admission-distribution.entity";
import { EducationAiAdviceLog } from "./entities/education-ai-advice-log.entity";
import { EducationApplication } from "./entities/education-application.entity";
import { EducationConsent } from "./entities/education-consent.entity";
import { EducationFaculty } from "./entities/education-faculty.entity";
import { EducationInstitution } from "./entities/education-institution.entity";
import { EducationProfile } from "./entities/education-profile.entity";
import { EducationProgramme } from "./entities/education-programme.entity";
import { EducationProgrammeOutcomeSignal } from "./entities/education-programme-outcome-signal.entity";
import { EducationRecommendationSnapshot } from "./entities/education-recommendation-snapshot.entity";
import { EducationRequirementDraft } from "./entities/education-requirement-draft.entity";
import { EducationRequirementVersion } from "./entities/education-requirement-version.entity";
import { EducationScholarship } from "./entities/education-scholarship.entity";
import { GuardianLink } from "./entities/guardian-link.entity";
import { AcademicResultRepository } from "./repositories/academic-result.repository";
import { MongoAcademicResultRepository } from "./repositories/academic-result.repository.mongo";
import { PostgresAcademicResultRepository } from "./repositories/academic-result.repository.postgres";
import { EducationAiAdviceLogRepository } from "./repositories/education-ai-advice-log.repository";
import { MongoEducationAiAdviceLogRepository } from "./repositories/education-ai-advice-log.repository.mongo";
import { PostgresEducationAiAdviceLogRepository } from "./repositories/education-ai-advice-log.repository.postgres";
import { EducationApplicationRepository } from "./repositories/education-application.repository";
import { MongoEducationApplicationRepository } from "./repositories/education-application.repository.mongo";
import { PostgresEducationApplicationRepository } from "./repositories/education-application.repository.postgres";
import { EducationConsentRepository } from "./repositories/education-consent.repository";
import { MongoEducationConsentRepository } from "./repositories/education-consent.repository.mongo";
import { PostgresEducationConsentRepository } from "./repositories/education-consent.repository.postgres";
import { EducationFacultyRepository } from "./repositories/education-faculty.repository";
import { MongoEducationFacultyRepository } from "./repositories/education-faculty.repository.mongo";
import { PostgresEducationFacultyRepository } from "./repositories/education-faculty.repository.postgres";
import { EducationInstitutionRepository } from "./repositories/education-institution.repository";
import { MongoEducationInstitutionRepository } from "./repositories/education-institution.repository.mongo";
import { PostgresEducationInstitutionRepository } from "./repositories/education-institution.repository.postgres";
import { EducationProfileRepository } from "./repositories/education-profile.repository";
import { MongoEducationProfileRepository } from "./repositories/education-profile.repository.mongo";
import { PostgresEducationProfileRepository } from "./repositories/education-profile.repository.postgres";
import { EducationProgrammeRepository } from "./repositories/education-programme.repository";
import { MongoEducationProgrammeRepository } from "./repositories/education-programme.repository.mongo";
import { PostgresEducationProgrammeRepository } from "./repositories/education-programme.repository.postgres";
import { EducationProgrammeOutcomeSignalRepository } from "./repositories/education-programme-outcome-signal.repository";
import { MongoEducationProgrammeOutcomeSignalRepository } from "./repositories/education-programme-outcome-signal.repository.mongo";
import { PostgresEducationProgrammeOutcomeSignalRepository } from "./repositories/education-programme-outcome-signal.repository.postgres";
import { EducationRecommendationSnapshotRepository } from "./repositories/education-recommendation-snapshot.repository";
import { MongoEducationRecommendationSnapshotRepository } from "./repositories/education-recommendation-snapshot.repository.mongo";
import { PostgresEducationRecommendationSnapshotRepository } from "./repositories/education-recommendation-snapshot.repository.postgres";
import { EducationRequirementDraftRepository } from "./repositories/education-requirement-draft.repository";
import { MongoEducationRequirementDraftRepository } from "./repositories/education-requirement-draft.repository.mongo";
import { PostgresEducationRequirementDraftRepository } from "./repositories/education-requirement-draft.repository.postgres";
import { EducationRequirementVersionRepository } from "./repositories/education-requirement-version.repository";
import { MongoEducationRequirementVersionRepository } from "./repositories/education-requirement-version.repository.mongo";
import { PostgresEducationRequirementVersionRepository } from "./repositories/education-requirement-version.repository.postgres";
import { EducationScholarshipRepository } from "./repositories/education-scholarship.repository";
import { MongoEducationScholarshipRepository } from "./repositories/education-scholarship.repository.mongo";
import { PostgresEducationScholarshipRepository } from "./repositories/education-scholarship.repository.postgres";
import { GuardianLinkRepository } from "./repositories/guardian-link.repository";
import { MongoGuardianLinkRepository } from "./repositories/guardian-link.repository.mongo";
import { PostgresGuardianLinkRepository } from "./repositories/guardian-link.repository.postgres";
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
    ...(isMongoDriver()
      ? [
          MongooseModule.forFeature([
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
            { name: "User", schema: UserSchema },
            { name: "UserAppAccess", schema: UserAppAccessSchema },
          ]),
        ]
      : []),
    ...(isMongoDriver()
      ? []
      : [
          TypeOrmModule.forFeature([
            EducationProfile,
            AcademicResult,
            GuardianLink,
            EducationConsent,
            EducationAiAdviceLog,
            EducationInstitution,
            EducationFaculty,
            EducationProgramme,
            EducationRequirementVersion,
            EducationRequirementDraft,
            EducationAdmissionDistribution,
            EducationRecommendationSnapshot,
            EducationProgrammeOutcomeSignal,
            EducationApplication,
            EducationScholarship,
            AnnixOrbitEeConsentTextVersion,
            AnnixOrbitProfile,
            User,
            UserAppAccess,
          ]),
        ]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret:
          configService.get<string>("ANNIX_ORBIT_JWT_SECRET") ??
          configService.get<string>("CV_ASSISTANT_JWT_SECRET", ANNIX_ORBIT_JWT_SECRET_DEFAULT),
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
    repositoryProvider(
      EducationProfileRepository,
      PostgresEducationProfileRepository,
      MongoEducationProfileRepository,
    ),
    repositoryProvider(
      AcademicResultRepository,
      PostgresAcademicResultRepository,
      MongoAcademicResultRepository,
    ),
    repositoryProvider(
      GuardianLinkRepository,
      PostgresGuardianLinkRepository,
      MongoGuardianLinkRepository,
    ),
    repositoryProvider(
      EducationConsentRepository,
      PostgresEducationConsentRepository,
      MongoEducationConsentRepository,
    ),
    repositoryProvider(
      EducationAiAdviceLogRepository,
      PostgresEducationAiAdviceLogRepository,
      MongoEducationAiAdviceLogRepository,
    ),
    repositoryProvider(
      EducationInstitutionRepository,
      PostgresEducationInstitutionRepository,
      MongoEducationInstitutionRepository,
    ),
    repositoryProvider(
      EducationFacultyRepository,
      PostgresEducationFacultyRepository,
      MongoEducationFacultyRepository,
    ),
    repositoryProvider(
      EducationProgrammeRepository,
      PostgresEducationProgrammeRepository,
      MongoEducationProgrammeRepository,
    ),
    repositoryProvider(
      EducationRequirementVersionRepository,
      PostgresEducationRequirementVersionRepository,
      MongoEducationRequirementVersionRepository,
    ),
    repositoryProvider(
      EducationRequirementDraftRepository,
      PostgresEducationRequirementDraftRepository,
      MongoEducationRequirementDraftRepository,
    ),
    repositoryProvider(
      EducationRecommendationSnapshotRepository,
      PostgresEducationRecommendationSnapshotRepository,
      MongoEducationRecommendationSnapshotRepository,
    ),
    repositoryProvider(
      EducationApplicationRepository,
      PostgresEducationApplicationRepository,
      MongoEducationApplicationRepository,
    ),
    repositoryProvider(
      EducationScholarshipRepository,
      PostgresEducationScholarshipRepository,
      MongoEducationScholarshipRepository,
    ),
    repositoryProvider(
      EducationProgrammeOutcomeSignalRepository,
      PostgresEducationProgrammeOutcomeSignalRepository,
      MongoEducationProgrammeOutcomeSignalRepository,
    ),
    repositoryProvider(
      AnnixOrbitEeConsentTextVersionRepository,
      PostgresAnnixOrbitEeConsentTextVersionRepository,
      MongoAnnixOrbitEeConsentTextVersionRepository,
    ),
    repositoryProvider(
      AnnixOrbitProfileRepository,
      PostgresAnnixOrbitProfileRepository,
      MongoAnnixOrbitProfileRepository,
    ),
    repositoryProvider(UserRepository, PostgresUserRepository, MongoUserRepository),
    repositoryProvider(
      UserAppAccessRepository,
      PostgresUserAppAccessRepository,
      MongoUserAppAccessRepository,
    ),
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

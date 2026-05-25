import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ANNIX_ORBIT_JWT_SECRET_DEFAULT } from "../annix-orbit/annix-orbit.constants";
import { AnnixOrbitEeConsentTextVersion } from "../annix-orbit/entities/annix-orbit-ee-consent-text-version.entity";
import { AnnixOrbitProfile } from "../annix-orbit/entities/annix-orbit-profile.entity";
import { AnnixOrbitAuthGuard } from "../annix-orbit/guards/annix-orbit-auth.guard";
import { MetricsModule } from "../metrics/metrics.module";
import { NixModule } from "../nix/nix.module";
import { UserAppAccess } from "../rbac/entities/user-app-access.entity";
import { User } from "../user/entities/user.entity";
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
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret:
          configService.get<string>("ANNIX_ORBIT_JWT_SECRET") ??
          configService.get<string>("CV_ASSISTANT_JWT_SECRET", ANNIX_ORBIT_JWT_SECRET_DEFAULT),
        signOptions: { expiresIn: "1h" },
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

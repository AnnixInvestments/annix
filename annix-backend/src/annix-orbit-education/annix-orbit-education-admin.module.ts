import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { AdminModule } from "../admin/admin.module";
import { ORBIT_CONNECTION } from "../lib/persistence/mongo-connections";
import { repositoryProvider } from "../lib/persistence/repository-provider";
import { MetricsModule } from "../metrics/metrics.module";
import { NixModule } from "../nix/nix.module";
import { SharedModule } from "../shared/shared.module";
import { StorageModule } from "../storage/storage.module";
import { AdminEducationCatalogController } from "./controllers/admin-education-catalog.controller";
import { AdminEducationIngestionController } from "./controllers/admin-education-ingestion.controller";
import { EducationAdmissionDistributionRepository } from "./repositories/education-admission-distribution.repository";
import { MongoEducationAdmissionDistributionRepository } from "./repositories/education-admission-distribution.repository.mongo";
import { EducationExtractionCorrectionRepository } from "./repositories/education-extraction-correction.repository";
import { MongoEducationExtractionCorrectionRepository } from "./repositories/education-extraction-correction.repository.mongo";
import { EducationFacultyRepository } from "./repositories/education-faculty.repository";
import { MongoEducationFacultyRepository } from "./repositories/education-faculty.repository.mongo";
import { EducationInstitutionRepository } from "./repositories/education-institution.repository";
import { MongoEducationInstitutionRepository } from "./repositories/education-institution.repository.mongo";
import { EducationProgrammeRepository } from "./repositories/education-programme.repository";
import { MongoEducationProgrammeRepository } from "./repositories/education-programme.repository.mongo";
import { EducationProgrammeOutcomeSignalRepository } from "./repositories/education-programme-outcome-signal.repository";
import { MongoEducationProgrammeOutcomeSignalRepository } from "./repositories/education-programme-outcome-signal.repository.mongo";
import { EducationRequirementDraftRepository } from "./repositories/education-requirement-draft.repository";
import { MongoEducationRequirementDraftRepository } from "./repositories/education-requirement-draft.repository.mongo";
import { EducationRequirementVersionRepository } from "./repositories/education-requirement-version.repository";
import { MongoEducationRequirementVersionRepository } from "./repositories/education-requirement-version.repository.mongo";
import { EducationScholarshipRepository } from "./repositories/education-scholarship.repository";
import { MongoEducationScholarshipRepository } from "./repositories/education-scholarship.repository.mongo";
import { EducationAdmissionDistributionSchema } from "./schemas/education-admission-distribution.schema";
import { EducationExtractionCorrectionSchema } from "./schemas/education-extraction-correction.schema";
import { EducationFacultySchema } from "./schemas/education-faculty.schema";
import { EducationInstitutionSchema } from "./schemas/education-institution.schema";
import { EducationProgrammeSchema } from "./schemas/education-programme.schema";
import { EducationProgrammeOutcomeSignalSchema } from "./schemas/education-programme-outcome-signal.schema";
import { EducationRequirementDraftSchema } from "./schemas/education-requirement-draft.schema";
import { EducationRequirementVersionSchema } from "./schemas/education-requirement-version.schema";
import { EducationScholarshipSchema } from "./schemas/education-scholarship.schema";
import { EducationAdmissionIngestionService } from "./services/education-admission-ingestion.service";
import { EducationCatalogAdminService } from "./services/education-catalog-admin.service";
import { EducationDraftReviewService } from "./services/education-draft-review.service";

/**
 * Admin curation of the FuturePath admissions catalog (#308). Kept SEPARATE from
 * AnnixOrbitEducationModule so it inherits AdminModule's JWT context
 * (AdminAuthGuard verifies admin tokens) without colliding with the seeker
 * module's Orbit-secret JwtModule.
 */
@Module({
  imports: [
    MongooseModule.forFeature(
      [
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
          name: "EducationExtractionCorrection",
          schema: EducationExtractionCorrectionSchema,
        },
        {
          name: "EducationAdmissionDistribution",
          schema: EducationAdmissionDistributionSchema,
        },
        {
          name: "EducationProgrammeOutcomeSignal",
          schema: EducationProgrammeOutcomeSignalSchema,
        },
        { name: "EducationScholarship", schema: EducationScholarshipSchema },
      ],
      ORBIT_CONNECTION,
    ),
    AdminModule,
    NixModule,
    StorageModule,
    SharedModule,
    MetricsModule,
  ],
  controllers: [AdminEducationCatalogController, AdminEducationIngestionController],
  providers: [
    EducationCatalogAdminService,
    EducationAdmissionIngestionService,
    EducationDraftReviewService,
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
      EducationExtractionCorrectionRepository,
      MongoEducationExtractionCorrectionRepository,
    ),
    repositoryProvider(
      EducationAdmissionDistributionRepository,
      MongoEducationAdmissionDistributionRepository,
    ),
    repositoryProvider(
      EducationProgrammeOutcomeSignalRepository,
      MongoEducationProgrammeOutcomeSignalRepository,
    ),
    repositoryProvider(EducationScholarshipRepository, MongoEducationScholarshipRepository),
  ],
})
export class AnnixOrbitEducationAdminModule {}

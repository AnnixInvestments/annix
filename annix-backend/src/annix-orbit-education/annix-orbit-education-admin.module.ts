import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AdminModule } from "../admin/admin.module";
import { isMongoDriver } from "../lib/persistence/database-driver";
import { ORBIT_CONNECTION } from "../lib/persistence/mongo-connections";
import { repositoryProvider } from "../lib/persistence/repository-provider";
import { MetricsModule } from "../metrics/metrics.module";
import { NixModule } from "../nix/nix.module";
import { SharedModule } from "../shared/shared.module";
import { StorageModule } from "../storage/storage.module";
import { AdminEducationCatalogController } from "./controllers/admin-education-catalog.controller";
import { AdminEducationIngestionController } from "./controllers/admin-education-ingestion.controller";
import { EducationAdmissionDistribution } from "./entities/education-admission-distribution.entity";
import { EducationExtractionCorrection } from "./entities/education-extraction-correction.entity";
import { EducationFaculty } from "./entities/education-faculty.entity";
import { EducationInstitution } from "./entities/education-institution.entity";
import { EducationProgramme } from "./entities/education-programme.entity";
import { EducationProgrammeOutcomeSignal } from "./entities/education-programme-outcome-signal.entity";
import { EducationRequirementDraft } from "./entities/education-requirement-draft.entity";
import { EducationRequirementVersion } from "./entities/education-requirement-version.entity";
import { EducationScholarship } from "./entities/education-scholarship.entity";
import { EducationAdmissionDistributionRepository } from "./repositories/education-admission-distribution.repository";
import { MongoEducationAdmissionDistributionRepository } from "./repositories/education-admission-distribution.repository.mongo";
import { PostgresEducationAdmissionDistributionRepository } from "./repositories/education-admission-distribution.repository.postgres";
import { EducationExtractionCorrectionRepository } from "./repositories/education-extraction-correction.repository";
import { MongoEducationExtractionCorrectionRepository } from "./repositories/education-extraction-correction.repository.mongo";
import { PostgresEducationExtractionCorrectionRepository } from "./repositories/education-extraction-correction.repository.postgres";
import { EducationFacultyRepository } from "./repositories/education-faculty.repository";
import { MongoEducationFacultyRepository } from "./repositories/education-faculty.repository.mongo";
import { PostgresEducationFacultyRepository } from "./repositories/education-faculty.repository.postgres";
import { EducationInstitutionRepository } from "./repositories/education-institution.repository";
import { MongoEducationInstitutionRepository } from "./repositories/education-institution.repository.mongo";
import { PostgresEducationInstitutionRepository } from "./repositories/education-institution.repository.postgres";
import { EducationProgrammeRepository } from "./repositories/education-programme.repository";
import { MongoEducationProgrammeRepository } from "./repositories/education-programme.repository.mongo";
import { PostgresEducationProgrammeRepository } from "./repositories/education-programme.repository.postgres";
import { EducationProgrammeOutcomeSignalRepository } from "./repositories/education-programme-outcome-signal.repository";
import { MongoEducationProgrammeOutcomeSignalRepository } from "./repositories/education-programme-outcome-signal.repository.mongo";
import { PostgresEducationProgrammeOutcomeSignalRepository } from "./repositories/education-programme-outcome-signal.repository.postgres";
import { EducationRequirementDraftRepository } from "./repositories/education-requirement-draft.repository";
import { MongoEducationRequirementDraftRepository } from "./repositories/education-requirement-draft.repository.mongo";
import { PostgresEducationRequirementDraftRepository } from "./repositories/education-requirement-draft.repository.postgres";
import { EducationRequirementVersionRepository } from "./repositories/education-requirement-version.repository";
import { MongoEducationRequirementVersionRepository } from "./repositories/education-requirement-version.repository.mongo";
import { PostgresEducationRequirementVersionRepository } from "./repositories/education-requirement-version.repository.postgres";
import { EducationScholarshipRepository } from "./repositories/education-scholarship.repository";
import { MongoEducationScholarshipRepository } from "./repositories/education-scholarship.repository.mongo";
import { PostgresEducationScholarshipRepository } from "./repositories/education-scholarship.repository.postgres";
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
    ...(isMongoDriver()
      ? [
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
        ]
      : [
          TypeOrmModule.forFeature([
            EducationInstitution,
            EducationFaculty,
            EducationProgramme,
            EducationRequirementVersion,
            EducationRequirementDraft,
            EducationExtractionCorrection,
            EducationAdmissionDistribution,
            EducationProgrammeOutcomeSignal,
            EducationScholarship,
          ]),
        ]),
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
      EducationExtractionCorrectionRepository,
      PostgresEducationExtractionCorrectionRepository,
      MongoEducationExtractionCorrectionRepository,
    ),
    repositoryProvider(
      EducationAdmissionDistributionRepository,
      PostgresEducationAdmissionDistributionRepository,
      MongoEducationAdmissionDistributionRepository,
    ),
    repositoryProvider(
      EducationProgrammeOutcomeSignalRepository,
      PostgresEducationProgrammeOutcomeSignalRepository,
      MongoEducationProgrammeOutcomeSignalRepository,
    ),
    repositoryProvider(
      EducationScholarshipRepository,
      PostgresEducationScholarshipRepository,
      MongoEducationScholarshipRepository,
    ),
  ],
})
export class AnnixOrbitEducationAdminModule {}

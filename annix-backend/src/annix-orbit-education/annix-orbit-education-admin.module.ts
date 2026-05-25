import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AdminModule } from "../admin/admin.module";
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
import { EducationAdmissionIngestionService } from "./services/education-admission-ingestion.service";
import { EducationCatalogAdminService } from "./services/education-catalog-admin.service";

/**
 * Admin curation of the FuturePath admissions catalog (#308). Kept SEPARATE from
 * AnnixOrbitEducationModule so it inherits AdminModule's JWT context
 * (AdminAuthGuard verifies admin tokens) without colliding with the seeker
 * module's Orbit-secret JwtModule.
 */
@Module({
  imports: [
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
    AdminModule,
    NixModule,
    StorageModule,
    SharedModule,
    MetricsModule,
  ],
  controllers: [AdminEducationCatalogController, AdminEducationIngestionController],
  providers: [EducationCatalogAdminService, EducationAdmissionIngestionService],
})
export class AnnixOrbitEducationAdminModule {}

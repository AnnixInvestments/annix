import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AdminModule } from "../admin/admin.module";
import { AdminEducationCatalogController } from "./controllers/admin-education-catalog.controller";
import { EducationAdmissionDistribution } from "./entities/education-admission-distribution.entity";
import { EducationFaculty } from "./entities/education-faculty.entity";
import { EducationInstitution } from "./entities/education-institution.entity";
import { EducationProgramme } from "./entities/education-programme.entity";
import { EducationRequirementVersion } from "./entities/education-requirement-version.entity";
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
      EducationAdmissionDistribution,
    ]),
    AdminModule,
  ],
  controllers: [AdminEducationCatalogController],
  providers: [EducationCatalogAdminService],
})
export class AnnixOrbitEducationAdminModule {}

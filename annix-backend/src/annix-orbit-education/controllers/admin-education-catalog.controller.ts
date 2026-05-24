import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from "class-validator";
import { AdminAuthGuard } from "../../admin/guards/admin-auth.guard";
import { EducationCatalogAdminService } from "../services/education-catalog-admin.service";

class InstitutionDto {
  @IsString()
  @MaxLength(64)
  code: string;

  @IsString()
  @MaxLength(255)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(2)
  country?: string | null;

  @IsOptional()
  @IsObject()
  defaultRequirementSpec?: Record<string, unknown> | null;
}

class UpdateInstitutionDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2)
  country?: string | null;

  @IsOptional()
  @IsObject()
  defaultRequirementSpec?: Record<string, unknown> | null;
}

class FacultyDto {
  @IsString()
  institutionId: string;

  @IsString()
  @MaxLength(64)
  code: string;

  @IsString()
  @MaxLength(255)
  name: string;

  @IsOptional()
  @IsObject()
  defaultRequirementSpec?: Record<string, unknown> | null;
}

class ProgrammeDto {
  @IsString()
  institutionId: string;

  @IsOptional()
  @IsString()
  facultyId?: string | null;

  @IsString()
  @MaxLength(64)
  code: string;

  @IsString()
  @MaxLength(255)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(48)
  careerCluster?: string | null;
}

class UpdateProgrammeDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsString()
  facultyId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(48)
  careerCluster?: string | null;
}

class RequirementVersionDto {
  @IsString()
  programmeId: string;

  @IsInt()
  @Min(1990)
  @Max(2100)
  intakeYear: number;

  @IsObject()
  spec: Record<string, unknown>;

  @IsString()
  @MaxLength(10)
  validFrom: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  validTo?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(16)
  confidence?: string;

  @IsOptional()
  @IsString()
  @MaxLength(24)
  verificationStatus?: string;
}

class ScholarshipDto {
  @IsString()
  @MaxLength(255)
  name: string;

  @IsString()
  @MaxLength(255)
  provider: string;

  @IsOptional()
  @IsString()
  @MaxLength(2)
  country?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  amountDisplay?: string | null;

  @IsOptional()
  @IsString()
  criteria?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  url?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(48)
  careerCluster?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  lastVerifiedAt?: string | null;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

class UpdateScholarshipDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  provider?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2)
  country?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  amountDisplay?: string | null;

  @IsOptional()
  @IsString()
  criteria?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  url?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(48)
  careerCluster?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  lastVerifiedAt?: string | null;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

class OutcomeSignalDto {
  @IsString()
  programmeId: string;

  @IsString()
  @MaxLength(120)
  source: string;

  @IsString()
  @MaxLength(64)
  metric: string;

  @IsNumber()
  value: number;

  @IsString()
  @MaxLength(16)
  unit: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  asOf?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(16)
  confidence?: string;

  @IsOptional()
  @IsString()
  @MaxLength(24)
  verificationStatus?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  sourceUrl?: string | null;
}

class DistributionDto {
  @IsString()
  programmeId: string;

  @IsInt()
  @Min(1990)
  @Max(2100)
  intakeYear: number;

  @IsOptional()
  @IsNumber()
  minAdmitted?: number | null;

  @IsOptional()
  @IsNumber()
  medianAdmitted?: number | null;

  @IsOptional()
  @IsNumber()
  p25Admitted?: number | null;

  @IsOptional()
  @IsNumber()
  p75Admitted?: number | null;

  @IsOptional()
  @IsInt()
  seats?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  source?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  asOf?: string | null;
}

/**
 * Admin catalog CRUD for FuturePath admissions data (#308). Owner enters
 * OWNER-VERIFIED institution/programme/requirement data here — nothing is
 * auto-seeded. Requirement versions are append-only (immutable history).
 */
@Controller("admin/annix-orbit/education")
@UseGuards(AdminAuthGuard)
export class AdminEducationCatalogController {
  constructor(private readonly catalog: EducationCatalogAdminService) {}

  @Get("institutions")
  async institutions() {
    return { institutions: await this.catalog.institutions() };
  }

  @Post("institutions")
  async createInstitution(@Body() body: InstitutionDto) {
    return { institution: await this.catalog.createInstitution(body) };
  }

  @Patch("institutions/:id")
  async updateInstitution(@Param("id") id: string, @Body() body: UpdateInstitutionDto) {
    return { institution: await this.catalog.updateInstitution(id, body) };
  }

  @Get("institutions/:id/faculties")
  async faculties(@Param("id") id: string) {
    return { faculties: await this.catalog.faculties(id) };
  }

  @Post("faculties")
  async createFaculty(@Body() body: FacultyDto) {
    return { faculty: await this.catalog.createFaculty(body) };
  }

  @Get("programmes")
  async programmes(@Query("institutionId") institutionId?: string) {
    return { programmes: await this.catalog.programmes(institutionId) };
  }

  @Post("programmes")
  async createProgramme(@Body() body: ProgrammeDto) {
    return { programme: await this.catalog.createProgramme(body) };
  }

  @Patch("programmes/:id")
  async updateProgramme(@Param("id") id: string, @Body() body: UpdateProgrammeDto) {
    return { programme: await this.catalog.updateProgramme(id, body) };
  }

  @Get("programmes/:id/requirement-versions")
  async requirementVersions(@Param("id") id: string) {
    return { requirementVersions: await this.catalog.requirementVersions(id) };
  }

  @Post("requirement-versions")
  async createRequirementVersion(@Body() body: RequirementVersionDto) {
    return { requirementVersion: await this.catalog.createRequirementVersion(body) };
  }

  @Get("programmes/:id/distributions")
  async distributions(@Param("id") id: string) {
    return { distributions: await this.catalog.distributions(id) };
  }

  @Post("distributions")
  async createDistribution(@Body() body: DistributionDto) {
    return { distribution: await this.catalog.createDistribution(body) };
  }

  @Get("programmes/:id/outcome-signals")
  async outcomeSignals(@Param("id") id: string) {
    return { outcomeSignals: await this.catalog.outcomeSignals(id) };
  }

  @Post("outcome-signals")
  async createOutcomeSignal(@Body() body: OutcomeSignalDto) {
    return { outcomeSignal: await this.catalog.createOutcomeSignal(body) };
  }

  @Get("scholarships")
  async scholarships() {
    return { scholarships: await this.catalog.scholarships() };
  }

  @Post("scholarships")
  async createScholarship(@Body() body: ScholarshipDto) {
    return { scholarship: await this.catalog.createScholarship(body) };
  }

  @Patch("scholarships/:id")
  async updateScholarship(@Param("id") id: string, @Body() body: UpdateScholarshipDto) {
    return { scholarship: await this.catalog.updateScholarship(id, body) };
  }
}

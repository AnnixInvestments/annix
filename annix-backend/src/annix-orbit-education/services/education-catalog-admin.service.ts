import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { EducationAdmissionDistribution } from "../entities/education-admission-distribution.entity";
import { EducationFaculty } from "../entities/education-faculty.entity";
import { EducationInstitution } from "../entities/education-institution.entity";
import { EducationProgramme } from "../entities/education-programme.entity";
import { EducationProgrammeOutcomeSignal } from "../entities/education-programme-outcome-signal.entity";
import { EducationRequirementVersion } from "../entities/education-requirement-version.entity";
import { EducationScholarship } from "../entities/education-scholarship.entity";
import { EducationAdmissionDistributionRepository } from "../repositories/education-admission-distribution.repository";
import { EducationFacultyRepository } from "../repositories/education-faculty.repository";
import { EducationInstitutionRepository } from "../repositories/education-institution.repository";
import { EducationProgrammeRepository } from "../repositories/education-programme.repository";
import { EducationProgrammeOutcomeSignalRepository } from "../repositories/education-programme-outcome-signal.repository";
import { EducationRequirementVersionRepository } from "../repositories/education-requirement-version.repository";
import { EducationScholarshipRepository } from "../repositories/education-scholarship.repository";

export interface InstitutionInput {
  code: string;
  name: string;
  country?: string | null;
  defaultRequirementSpec?: Record<string, unknown> | null;
}

export interface FacultyInput {
  institutionId: string;
  code: string;
  name: string;
  defaultRequirementSpec?: Record<string, unknown> | null;
}

export interface ProgrammeInput {
  institutionId: string;
  facultyId?: string | null;
  code: string;
  name: string;
  careerCluster?: string | null;
}

export interface RequirementVersionInput {
  programmeId: string;
  intakeYear: number;
  spec: Record<string, unknown>;
  validFrom: string;
  validTo?: string | null;
  confidence?: string;
  verificationStatus?: string;
}

export interface AdmissionDistributionInput {
  programmeId: string;
  intakeYear: number;
  minAdmitted?: number | null;
  medianAdmitted?: number | null;
  p25Admitted?: number | null;
  p75Admitted?: number | null;
  seats?: number | null;
  source?: string | null;
  asOf?: string | null;
}

const FORBIDDEN_OUTCOME_SOURCES = ["qs", "times higher", "the world university", "quacquarelli"];

export interface OutcomeSignalInput {
  programmeId: string;
  source: string;
  metric: string;
  value: number;
  unit: string;
  asOf?: string | null;
  confidence?: string;
  verificationStatus?: string;
  sourceUrl?: string | null;
}

export interface ScholarshipInput {
  name: string;
  provider: string;
  country?: string | null;
  amountDisplay?: string | null;
  criteria?: string | null;
  url?: string | null;
  careerCluster?: string | null;
  lastVerifiedAt?: string | null;
  active?: boolean;
}

/**
 * Admin curation of the FuturePath admissions catalog (#308). The owner enters
 * OWNER-VERIFIED data here; this service intentionally seeds nothing itself
 * (the accuracy guardrail forbids fabricated cut-offs). Requirement versions are
 * append-only — editing a programme's rules creates a NEW version, never an
 * in-place update, so historical recommendations stay reproducible.
 */
@Injectable()
export class EducationCatalogAdminService {
  constructor(
    private readonly institutionRepo: EducationInstitutionRepository,
    private readonly facultyRepo: EducationFacultyRepository,
    private readonly programmeRepo: EducationProgrammeRepository,
    private readonly requirementVersionRepo: EducationRequirementVersionRepository,
    private readonly distributionRepo: EducationAdmissionDistributionRepository,
    private readonly outcomeSignalRepo: EducationProgrammeOutcomeSignalRepository,
    private readonly scholarshipRepo: EducationScholarshipRepository,
  ) {}

  institutions(): Promise<EducationInstitution[]> {
    return this.institutionRepo.allOrderedByName();
  }

  async createInstitution(input: InstitutionInput): Promise<EducationInstitution> {
    return this.institutionRepo.create({
      code: input.code,
      name: input.name,
      country: input.country ?? null,
      defaultRequirementSpec: input.defaultRequirementSpec ?? null,
    });
  }

  async updateInstitution(
    id: string,
    input: Partial<InstitutionInput>,
  ): Promise<EducationInstitution> {
    const institution = await this.institutionRepo.findById(id);
    if (!institution) throw new NotFoundException(`Institution ${id} not found`);
    if (input.name != null) institution.name = input.name;
    if (input.country !== undefined) institution.country = input.country;
    if (input.defaultRequirementSpec !== undefined) {
      institution.defaultRequirementSpec = input.defaultRequirementSpec;
    }
    return this.institutionRepo.save(institution);
  }

  faculties(institutionId: string): Promise<EducationFaculty[]> {
    return this.facultyRepo.forInstitutionOrderedByName(institutionId);
  }

  async createFaculty(input: FacultyInput): Promise<EducationFaculty> {
    await this.institutionOrThrow(input.institutionId);
    return this.facultyRepo.create({
      institutionId: input.institutionId,
      code: input.code,
      name: input.name,
      defaultRequirementSpec: input.defaultRequirementSpec ?? null,
    });
  }

  programmes(institutionId?: string): Promise<EducationProgramme[]> {
    return this.programmeRepo.listForInstitution(institutionId ?? null, 500);
  }

  async createProgramme(input: ProgrammeInput): Promise<EducationProgramme> {
    await this.institutionOrThrow(input.institutionId);
    return this.programmeRepo.create({
      institutionId: input.institutionId,
      facultyId: input.facultyId ?? null,
      code: input.code,
      name: input.name,
      careerCluster: input.careerCluster ?? null,
    });
  }

  async updateProgramme(id: string, input: Partial<ProgrammeInput>): Promise<EducationProgramme> {
    const programme = await this.programmeRepo.findById(id);
    if (!programme) throw new NotFoundException(`Programme ${id} not found`);
    if (input.name != null) programme.name = input.name;
    if (input.facultyId !== undefined) programme.facultyId = input.facultyId;
    if (input.careerCluster !== undefined) programme.careerCluster = input.careerCluster;
    return this.programmeRepo.save(programme);
  }

  requirementVersions(programmeId: string): Promise<EducationRequirementVersion[]> {
    return this.requirementVersionRepo.forProgrammeOrdered(programmeId);
  }

  /** Append-only: always creates a NEW immutable version. */
  async createRequirementVersion(
    input: RequirementVersionInput,
  ): Promise<EducationRequirementVersion> {
    const programme = await this.programmeRepo.findById(input.programmeId);
    if (!programme) throw new NotFoundException(`Programme ${input.programmeId} not found`);
    return this.requirementVersionRepo.create({
      programmeId: input.programmeId,
      intakeYear: input.intakeYear,
      spec: input.spec,
      validFrom: input.validFrom,
      validTo: input.validTo ?? null,
      confidence: input.confidence ?? "NEEDS_REVIEW",
      verificationStatus: input.verificationStatus ?? "NEEDS_REVIEW",
    });
  }

  distributions(programmeId: string): Promise<EducationAdmissionDistribution[]> {
    return this.distributionRepo.forProgrammeOrderedByYear(programmeId);
  }

  async createDistribution(
    input: AdmissionDistributionInput,
  ): Promise<EducationAdmissionDistribution> {
    const programme = await this.programmeRepo.findById(input.programmeId);
    if (!programme) throw new NotFoundException(`Programme ${input.programmeId} not found`);
    const toNumeric = (value: number | null | undefined): string | null =>
      value != null ? value.toFixed(2) : null;
    return this.distributionRepo.create({
      programmeId: input.programmeId,
      intakeYear: input.intakeYear,
      minAdmitted: toNumeric(input.minAdmitted),
      medianAdmitted: toNumeric(input.medianAdmitted),
      p25Admitted: toNumeric(input.p25Admitted),
      p75Admitted: toNumeric(input.p75Admitted),
      seats: input.seats ?? null,
      source: input.source ?? null,
      asOf: input.asOf ?? null,
    });
  }

  outcomeSignals(programmeId: string): Promise<EducationProgrammeOutcomeSignal[]> {
    return this.outcomeSignalRepo.forProgrammeOrdered(programmeId);
  }

  async createOutcomeSignal(input: OutcomeSignalInput): Promise<EducationProgrammeOutcomeSignal> {
    const programme = await this.programmeRepo.findById(input.programmeId);
    if (!programme) throw new NotFoundException(`Programme ${input.programmeId} not found`);
    // Firewall: never store license-restricted ranking data (QS/THE) — #309.
    const sourceLower = input.source.toLowerCase();
    if (FORBIDDEN_OUTCOME_SOURCES.some((banned) => sourceLower.includes(banned))) {
      throw new BadRequestException(
        "QS / Times Higher Education rankings are license-restricted and must not be stored.",
      );
    }
    return this.outcomeSignalRepo.create({
      programmeId: input.programmeId,
      source: input.source,
      metric: input.metric,
      value: input.value.toFixed(2),
      unit: input.unit,
      asOf: input.asOf ?? null,
      confidence: input.confidence ?? "NEEDS_REVIEW",
      verificationStatus: input.verificationStatus ?? "NEEDS_REVIEW",
      sourceUrl: input.sourceUrl ?? null,
    });
  }

  scholarships(): Promise<EducationScholarship[]> {
    return this.scholarshipRepo.allOrderedByName();
  }

  async createScholarship(input: ScholarshipInput): Promise<EducationScholarship> {
    return this.scholarshipRepo.create({
      name: input.name,
      provider: input.provider,
      country: input.country ?? null,
      amountDisplay: input.amountDisplay ?? null,
      criteria: input.criteria ?? null,
      url: input.url ?? null,
      careerCluster: input.careerCluster ?? null,
      lastVerifiedAt: input.lastVerifiedAt ?? null,
      active: input.active ?? true,
    });
  }

  async updateScholarship(
    id: string,
    input: Partial<ScholarshipInput>,
  ): Promise<EducationScholarship> {
    const scholarship = await this.scholarshipRepo.findById(id);
    if (!scholarship) throw new NotFoundException(`Scholarship ${id} not found`);
    if (input.name != null) scholarship.name = input.name;
    if (input.provider != null) scholarship.provider = input.provider;
    if (input.country !== undefined) scholarship.country = input.country;
    if (input.amountDisplay !== undefined) scholarship.amountDisplay = input.amountDisplay;
    if (input.criteria !== undefined) scholarship.criteria = input.criteria;
    if (input.url !== undefined) scholarship.url = input.url;
    if (input.careerCluster !== undefined) scholarship.careerCluster = input.careerCluster;
    if (input.lastVerifiedAt !== undefined) scholarship.lastVerifiedAt = input.lastVerifiedAt;
    if (input.active !== undefined) scholarship.active = input.active;
    return this.scholarshipRepo.save(scholarship);
  }

  private async institutionOrThrow(id: string): Promise<EducationInstitution> {
    const institution = await this.institutionRepo.findById(id);
    if (!institution) throw new NotFoundException(`Institution ${id} not found`);
    return institution;
  }
}

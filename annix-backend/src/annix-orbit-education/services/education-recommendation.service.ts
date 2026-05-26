import {
  type ApplicantProfile,
  type ApplicantSubjectResult,
  type EvaluationResult,
  evaluateRequirement,
  nscCapabilityForSubject,
  type RequirementSpec,
  type SubjectRole,
} from "@annix/product-data/orbit-education";
import { Injectable } from "@nestjs/common";
import type { EducationProfile } from "../entities/education-profile.entity";
import { AcademicResultRepository } from "../repositories/academic-result.repository";
import { EducationFacultyRepository } from "../repositories/education-faculty.repository";
import { EducationInstitutionRepository } from "../repositories/education-institution.repository";
import { EducationProgrammeRepository } from "../repositories/education-programme.repository";
import { EducationRecommendationSnapshotRepository } from "../repositories/education-recommendation-snapshot.repository";
import { EducationRequirementVersionRepository } from "../repositories/education-requirement-version.repository";
import { EducationConsentService } from "./education-consent.service";
import { EducationProfileService } from "./education-profile.service";

interface ResolvedSpec {
  spec: RequirementSpec;
  requirementVersionId: string | null;
}

export interface ProgrammeRecommendation {
  programmeId: string;
  programmeName: string;
  institutionId: string;
  band: EvaluationResult["competitiveness"]["band"];
  result: EvaluationResult;
}

const BAND_ORDER: Record<string, number> = { safe: 0, match: 1, reach: 2, below: 3, unknown: 4 };

@Injectable()
export class EducationRecommendationService {
  constructor(
    private readonly programmeRepo: EducationProgrammeRepository,
    private readonly facultyRepo: EducationFacultyRepository,
    private readonly institutionRepo: EducationInstitutionRepository,
    private readonly requirementVersionRepo: EducationRequirementVersionRepository,
    private readonly snapshotRepo: EducationRecommendationSnapshotRepository,
    private readonly resultRepo: AcademicResultRepository,
    private readonly profileService: EducationProfileService,
    private readonly consentService: EducationConsentService,
  ) {}

  /** Resolve a programme's effective spec: requirement version → faculty default → institution default. */
  async resolveSpec(programmeId: string, intakeYear: number): Promise<ResolvedSpec | null> {
    const version = await this.requirementVersionRepo.latestForProgrammeAndYear(
      programmeId,
      intakeYear,
    );
    if (version) {
      return { spec: version.spec as unknown as RequirementSpec, requirementVersionId: version.id };
    }
    const programme = await this.programmeRepo.findById(programmeId);
    if (!programme) return null;
    if (programme.facultyId) {
      const faculty = await this.facultyRepo.findById(programme.facultyId);
      if (faculty?.defaultRequirementSpec) {
        return {
          spec: faculty.defaultRequirementSpec as unknown as RequirementSpec,
          requirementVersionId: null,
        };
      }
    }
    const institution = await this.institutionRepo.findById(programme.institutionId);
    if (institution?.defaultRequirementSpec) {
      return {
        spec: institution.defaultRequirementSpec as unknown as RequirementSpec,
        requirementVersionId: null,
      };
    }
    return null;
  }

  async applicantProfileFor(educationProfile: EducationProfile): Promise<ApplicantProfile> {
    const results = await this.resultRepo.forProfile(educationProfile.id);
    const subjects: ApplicantSubjectResult[] = results.map((r) => {
      const capability = nscCapabilityForSubject(r.subject);
      const percentSource = r.mark ?? r.predictedMark;
      const percent = percentSource != null ? Number(percentSource) : null;
      return {
        name: r.subject,
        capability,
        roles: this.rolesFor(r.subject, capability),
        percent,
      };
    });
    return { subjects };
  }

  private rolesFor(
    subjectName: string,
    capability: ApplicantSubjectResult["capability"],
  ): SubjectRole[] {
    const roles: SubjectRole[] = [];
    const lower = subjectName.trim().toLowerCase();
    if (lower.includes("life orientation")) roles.push("excluded");
    if (capability === "quantitative_reasoning") roles.push("mathematics");
    if (capability === "mathematical_literacy") roles.push("mathematical_literacy");
    if (capability === "language_proficiency") roles.push("language_of_instruction");
    return roles;
  }

  async evaluateProgramme(
    educationProfile: EducationProfile,
    programmeId: string,
    intakeYear: number,
    applicant?: ApplicantProfile,
  ): Promise<ProgrammeRecommendation | null> {
    await this.consentService.assertProcessingAllowed(educationProfile);
    const resolved = await this.resolveSpec(programmeId, intakeYear);
    if (!resolved) return null;
    const programme = await this.programmeRepo.findById(programmeId);
    if (!programme) return null;

    const profileApplicant = applicant ?? (await this.applicantProfileFor(educationProfile));
    const result = evaluateRequirement(profileApplicant, resolved.spec);

    await this.snapshotRepo.create({
      educationProfileId: educationProfile.id,
      programmeId,
      intakeYear,
      requirementVersionId: resolved.requirementVersionId,
      band: result.competitiveness.band,
      result: result as unknown as Record<string, unknown>,
    });

    return {
      programmeId,
      programmeName: programme.name,
      institutionId: programme.institutionId,
      band: result.competitiveness.band,
      result,
    };
  }

  /**
   * Evaluate the learner against the curated catalog for an intake year, ranked
   * best-fit first. Returns [] until the owner has curated programmes — the
   * engine is wired and ready; no fabricated programmes are seeded.
   */
  async recommendForUser(userId: number, intakeYear: number): Promise<ProgrammeRecommendation[]> {
    const educationProfile = await this.profileService.profileForUser(userId);
    if (!educationProfile) return [];
    await this.consentService.assertProcessingAllowed(educationProfile);

    const programmes = await this.programmeRepo.page(200);
    if (programmes.length === 0) return [];

    const applicant = await this.applicantProfileFor(educationProfile);
    const evaluated = await Promise.all(
      programmes.map((programme) =>
        this.evaluateProgramme(educationProfile, programme.id, intakeYear, applicant),
      ),
    );
    const recommendations = evaluated.filter((rec): rec is ProgrammeRecommendation => rec !== null);

    return recommendations.sort((a, b) => {
      const bandDiff = (BAND_ORDER[a.band] ?? 9) - (BAND_ORDER[b.band] ?? 9);
      if (bandDiff !== 0) return bandDiff;
      const aScore = a.result.scoring.adjustedScore ?? 0;
      const bScore = b.result.scoring.adjustedScore ?? 0;
      return bScore - aScore;
    });
  }
}

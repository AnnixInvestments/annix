import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { isOrbitEducationCurriculum } from "../annix-orbit-education.constants";
import { AcademicResult } from "../entities/academic-result.entity";
import { EducationProfile } from "../entities/education-profile.entity";
import { AcademicResultRepository } from "../repositories/academic-result.repository";
import { EducationProfileRepository } from "../repositories/education-profile.repository";
import { EducationConsentService } from "./education-consent.service";

export interface CreateEducationProfileInput {
  curriculum?: string;
  country?: string | null;
  nationality?: string | null;
  languages?: string[];
  school?: string | null;
  dateOfBirth?: string | null;
}

export interface AddAcademicResultInput {
  subject: string;
  mark?: number | null;
  predictedMark?: number | null;
  year?: number | null;
  term?: string | null;
}

@Injectable()
export class EducationProfileService {
  private readonly logger = new Logger(EducationProfileService.name);

  constructor(
    private readonly profileRepo: EducationProfileRepository,
    private readonly resultRepo: AcademicResultRepository,
    private readonly consentService: EducationConsentService,
  ) {}

  async profileForUser(userId: number): Promise<EducationProfile | null> {
    return this.profileRepo.findByUserId(userId);
  }

  async profileOrThrow(id: string): Promise<EducationProfile> {
    const profile = await this.profileRepo.findById(id);
    if (!profile) {
      throw new NotFoundException(`Education profile ${id} not found`);
    }
    return profile;
  }

  async upsertProfile(
    userId: number,
    input: CreateEducationProfileInput,
  ): Promise<EducationProfile> {
    const existing = await this.profileForUser(userId);
    const country = input.country ?? existing?.country ?? null;
    const jurisdiction = this.consentService.jurisdictionForCountry(country);
    const curriculum =
      input.curriculum && isOrbitEducationCurriculum(input.curriculum)
        ? input.curriculum
        : (existing?.curriculum ?? "Other");

    const nationality = input.nationality ?? existing?.nationality ?? null;
    const languages = input.languages ?? existing?.languages ?? [];
    const school = input.school ?? existing?.school ?? null;
    const dateOfBirth = input.dateOfBirth ?? existing?.dateOfBirth ?? null;

    const saved = existing
      ? await this.profileRepo.save({
          ...existing,
          curriculum,
          country,
          nationality,
          languages,
          school,
          dateOfBirth,
          jurisdiction,
        })
      : await this.profileRepo.create({
          userId,
          curriculum,
          country,
          nationality,
          languages,
          school,
          dateOfBirth,
          jurisdiction,
        });
    this.logger.log(`Upserted education profile ${saved.id} for user ${userId}`);
    return saved;
  }

  async addResult(
    educationProfileId: string,
    input: AddAcademicResultInput,
  ): Promise<AcademicResult> {
    const profile = await this.profileOrThrow(educationProfileId);
    await this.consentService.assertProcessingAllowed(profile);
    const saved = await this.resultRepo.create({
      educationProfileId,
      subject: input.subject,
      mark: input.mark != null ? input.mark.toFixed(2) : null,
      predictedMark: input.predictedMark != null ? input.predictedMark.toFixed(2) : null,
      year: input.year ?? null,
      term: input.term ?? null,
    });
    return saved;
  }

  async resultsForProfile(educationProfileId: string): Promise<AcademicResult[]> {
    return this.resultRepo.orderedForProfile(educationProfileId);
  }

  async deleteResult(educationProfileId: string, resultId: string): Promise<boolean> {
    const affected = await this.resultRepo.deleteByIdForProfile(resultId, educationProfileId);
    return affected > 0;
  }
}

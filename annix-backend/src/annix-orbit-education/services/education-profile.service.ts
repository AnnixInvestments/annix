import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { isOrbitEducationCurriculum } from "../annix-orbit-education.constants";
import { AcademicResult } from "../entities/academic-result.entity";
import { EducationProfile } from "../entities/education-profile.entity";
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
    @InjectRepository(EducationProfile)
    private readonly profileRepo: Repository<EducationProfile>,
    @InjectRepository(AcademicResult)
    private readonly resultRepo: Repository<AcademicResult>,
    private readonly consentService: EducationConsentService,
  ) {}

  async profileForUser(userId: number): Promise<EducationProfile | null> {
    return this.profileRepo.findOne({ where: { userId } });
  }

  async profileOrThrow(id: string): Promise<EducationProfile> {
    const profile = await this.profileRepo.findOne({ where: { id } });
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

    const profile =
      existing ?? this.profileRepo.create({ userId, languages: [], jurisdiction: "POPIA" });
    profile.curriculum = curriculum;
    profile.country = country;
    profile.nationality = input.nationality ?? existing?.nationality ?? null;
    profile.languages = input.languages ?? existing?.languages ?? [];
    profile.school = input.school ?? existing?.school ?? null;
    profile.dateOfBirth = input.dateOfBirth ?? existing?.dateOfBirth ?? null;
    profile.jurisdiction = jurisdiction;

    const saved = await this.profileRepo.save(profile);
    this.logger.log(`Upserted education profile ${saved.id} for user ${userId}`);
    return saved;
  }

  async addResult(
    educationProfileId: string,
    input: AddAcademicResultInput,
  ): Promise<AcademicResult> {
    const profile = await this.profileOrThrow(educationProfileId);
    await this.consentService.assertProcessingAllowed(profile);
    const saved = await this.resultRepo.save(
      this.resultRepo.create({
        educationProfileId,
        subject: input.subject,
        mark: input.mark != null ? input.mark.toFixed(2) : null,
        predictedMark: input.predictedMark != null ? input.predictedMark.toFixed(2) : null,
        year: input.year ?? null,
        term: input.term ?? null,
      }),
    );
    return saved;
  }

  async resultsForProfile(educationProfileId: string): Promise<AcademicResult[]> {
    return this.resultRepo.find({
      where: { educationProfileId },
      order: { year: "DESC", subject: "ASC" },
    });
  }

  async deleteResult(educationProfileId: string, resultId: string): Promise<boolean> {
    const result = await this.resultRepo.delete({ id: resultId, educationProfileId });
    return (result.affected ?? 0) > 0;
  }
}

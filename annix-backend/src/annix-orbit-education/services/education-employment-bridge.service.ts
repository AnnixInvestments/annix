import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { AnnixOrbitUserType } from "../../annix-orbit/entities/annix-orbit-profile.entity";
import type { ExtractedCvData } from "../../annix-orbit/entities/candidate.entity";
import { AnnixOrbitProfileRepository } from "../../annix-orbit/repositories/annix-orbit-profile.repository";
import { now } from "../../lib/datetime";
import type { User } from "../../user/entities/user.entity";
import { UserRepository } from "../../user/user.repository";
import type { AcademicResult } from "../entities/academic-result.entity";
import type { EducationProfile } from "../entities/education-profile.entity";
import { AcademicResultRepository } from "../repositories/academic-result.repository";
import { EducationProfileRepository } from "../repositories/education-profile.repository";

export interface PromotionResult {
  profileId: number;
  created: boolean;
  userType: AnnixOrbitUserType;
}

@Injectable()
export class EducationEmploymentBridgeService {
  private readonly logger = new Logger(EducationEmploymentBridgeService.name);

  constructor(
    private readonly profileRepo: EducationProfileRepository,
    private readonly resultRepo: AcademicResultRepository,
    private readonly userRepo: UserRepository,
    private readonly orbitProfileRepo: AnnixOrbitProfileRepository,
  ) {}

  async promoteToJobMarket(userId: number): Promise<PromotionResult> {
    const educationProfile = await this.profileRepo.findByUserId(userId);
    if (!educationProfile) {
      throw new NotFoundException("No FuturePath education profile found for this account.");
    }
    const existing = await this.orbitProfileRepo.findByUserId(userId);
    if (existing && existing.userType === AnnixOrbitUserType.COMPANY) {
      throw new BadRequestException(
        "This is an employer account — it cannot join the job market as a seeker.",
      );
    }
    const results = await this.resultRepo.forProfile(educationProfile.id);
    const user = await this.userRepo.findById(userId);
    const cvData = this.toCvData(educationProfile, results, user);

    if (existing) {
      existing.extractedCvData = { ...(existing.extractedCvData ?? this.emptyCv()), ...cvData };
      const saved = await this.orbitProfileRepo.save(existing);
      this.logger.log(
        `Updated Orbit seeker profile ${saved.id} from education profile ${educationProfile.id}`,
      );
      return { profileId: saved.id, created: false, userType: saved.userType };
    }

    const saved = await this.orbitProfileRepo.create({
      userId,
      userType: AnnixOrbitUserType.INDIVIDUAL,
      extractedCvData: cvData,
      cvUploadedAt: now().toJSDate(),
    });
    this.logger.log(
      `Created Orbit seeker profile ${saved.id} from education profile ${educationProfile.id}`,
    );
    return { profileId: saved.id, created: true, userType: saved.userType };
  }

  private toCvData(
    profile: EducationProfile,
    results: AcademicResult[],
    user: User | null,
  ): ExtractedCvData {
    const fullName = user ? [user.firstName, user.lastName].filter(Boolean).join(" ").trim() : "";
    const candidateName = fullName.length > 0 ? fullName : (user?.email ?? null);
    const subjectLines = results.map(
      (result) => `${result.subject}: ${result.mark ?? result.predictedMark ?? "?"}`,
    );
    const schoolLine = profile.school
      ? `${profile.school} — ${profile.curriculum}`
      : profile.curriculum;
    const education = [schoolLine, ...subjectLines].filter(
      (entry): entry is string => typeof entry === "string" && entry.length > 0,
    );
    const languages = Array.isArray(profile.languages) ? profile.languages : [];
    return {
      ...this.emptyCv(),
      candidateName,
      email: user?.email ?? null,
      education,
      saQualifications: profile.curriculum ? [profile.curriculum] : [],
      detectedLanguage: languages.length > 0 ? String(languages[0]) : null,
      location: profile.country ?? null,
      summary: `FuturePath graduate${profile.school ? ` from ${profile.school}` : ""}.`,
    };
  }

  private emptyCv(): ExtractedCvData {
    return {
      candidateName: null,
      email: null,
      phone: null,
      experienceYears: null,
      skills: [],
      education: [],
      certifications: [],
      references: [],
      summary: null,
      detectedLanguage: null,
      professionalRegistrations: [],
      saQualifications: [],
      location: null,
    };
  }
}

import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import {
  AnnixOrbitProfile,
  AnnixOrbitUserType,
} from "../../annix-orbit/entities/annix-orbit-profile.entity";
import type { ExtractedCvData } from "../../annix-orbit/entities/candidate.entity";
import { now } from "../../lib/datetime";
import { User } from "../../user/entities/user.entity";
import { AcademicResult } from "../entities/academic-result.entity";
import { EducationProfile } from "../entities/education-profile.entity";

export interface PromotionResult {
  profileId: number;
  created: boolean;
  userType: AnnixOrbitUserType;
}

@Injectable()
export class EducationEmploymentBridgeService {
  private readonly logger = new Logger(EducationEmploymentBridgeService.name);

  constructor(
    @InjectRepository(EducationProfile)
    private readonly profileRepo: Repository<EducationProfile>,
    @InjectRepository(AcademicResult)
    private readonly resultRepo: Repository<AcademicResult>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(AnnixOrbitProfile)
    private readonly orbitProfileRepo: Repository<AnnixOrbitProfile>,
  ) {}

  async promoteToJobMarket(userId: number): Promise<PromotionResult> {
    const educationProfile = await this.profileRepo.findOne({ where: { userId } });
    if (!educationProfile) {
      throw new NotFoundException("No FuturePath education profile found for this account.");
    }
    const existing = await this.orbitProfileRepo.findOne({ where: { userId } });
    if (existing && existing.userType === AnnixOrbitUserType.COMPANY) {
      throw new BadRequestException(
        "This is an employer account — it cannot join the job market as a seeker.",
      );
    }
    const results = await this.resultRepo.find({
      where: { educationProfileId: educationProfile.id },
    });
    const user = await this.userRepo.findOne({ where: { id: userId } });
    const cvData = this.toCvData(educationProfile, results, user);

    if (existing) {
      existing.extractedCvData = { ...(existing.extractedCvData ?? this.emptyCv()), ...cvData };
      const saved = await this.orbitProfileRepo.save(existing);
      this.logger.log(
        `Updated Orbit seeker profile ${saved.id} from education profile ${educationProfile.id}`,
      );
      return { profileId: saved.id, created: false, userType: saved.userType };
    }

    const created = this.orbitProfileRepo.create({
      userId,
      userType: AnnixOrbitUserType.INDIVIDUAL,
      extractedCvData: cvData,
      cvUploadedAt: now().toJSDate(),
    });
    const saved = await this.orbitProfileRepo.save(created);
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

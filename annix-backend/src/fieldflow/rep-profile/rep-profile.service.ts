import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { now } from "../../lib/datetime";
import { CreateRepProfileDto, UpdateRepProfileDto } from "./rep-profile.dto";
import { RepProfile } from "./rep-profile.entity";

@Injectable()
export class RepProfileService {
  private readonly logger = new Logger(RepProfileService.name);

  constructor(
    @InjectRepository(RepProfile)
    private readonly repProfileRepo: Repository<RepProfile>,
  ) {}

  async profileByUserId(userId: number): Promise<RepProfile | null> {
    return this.repProfileRepo.findOne({
      where: { userId },
    });
  }

  async setupStatus(
    userId: number,
  ): Promise<{ setupCompleted: boolean; profile: RepProfile | null }> {
    const profile = await this.profileByUserId(userId);
    return {
      setupCompleted: profile?.setupCompleted ?? false,
      profile,
    };
  }

  async createProfile(userId: number, dto: CreateRepProfileDto): Promise<RepProfile> {
    const existing = await this.profileByUserId(userId);
    if (existing) {
      return this.updateProfile(userId, dto);
    }

    const profile = this.repProfileRepo.create({
      userId,
      industry: dto.industry,
      subIndustries: dto.subIndustries,
      productCategories: dto.productCategories,
      companyName: dto.companyName ?? null,
      jobTitle: dto.jobTitle ?? null,
      territoryDescription: dto.territoryDescription ?? null,
      defaultSearchLatitude: dto.defaultSearchLatitude ?? null,
      defaultSearchLongitude: dto.defaultSearchLongitude ?? null,
      defaultSearchRadiusKm: dto.defaultSearchRadiusKm ?? 25,
      targetCustomerProfile: dto.targetCustomerProfile ?? null,
      customSearchTerms: dto.customSearchTerms ?? null,
      setupCompleted: true,
      setupCompletedAt: now().toJSDate(),
    });

    const saved = await this.repProfileRepo.save(profile);
    this.logger.log(`Rep profile created for user ${userId}`);
    return saved;
  }

  async updateProfile(userId: number, dto: UpdateRepProfileDto): Promise<RepProfile> {
    let profile = await this.profileByUserId(userId);

    if (!profile) {
      profile = this.repProfileRepo.create({
        userId,
        industry: dto.industry ?? "",
        subIndustries: dto.subIndustries ?? [],
        productCategories: dto.productCategories ?? [],
        setupCompleted: false,
      });
    }

    if (dto.industry !== undefined) {
      profile.industry = dto.industry;
    }
    if (dto.subIndustries !== undefined) {
      profile.subIndustries = dto.subIndustries;
    }
    if (dto.productCategories !== undefined) {
      profile.productCategories = dto.productCategories;
    }
    if (dto.companyName !== undefined) {
      profile.companyName = dto.companyName ?? null;
    }
    if (dto.jobTitle !== undefined) {
      profile.jobTitle = dto.jobTitle ?? null;
    }
    if (dto.territoryDescription !== undefined) {
      profile.territoryDescription = dto.territoryDescription ?? null;
    }
    if (dto.defaultSearchLatitude !== undefined) {
      profile.defaultSearchLatitude = dto.defaultSearchLatitude ?? null;
    }
    if (dto.defaultSearchLongitude !== undefined) {
      profile.defaultSearchLongitude = dto.defaultSearchLongitude ?? null;
    }
    if (dto.defaultSearchRadiusKm !== undefined) {
      profile.defaultSearchRadiusKm = dto.defaultSearchRadiusKm;
    }
    if (dto.targetCustomerProfile !== undefined) {
      profile.targetCustomerProfile = dto.targetCustomerProfile ?? null;
    }
    if (dto.customSearchTerms !== undefined) {
      profile.customSearchTerms = dto.customSearchTerms ?? null;
    }
    if (dto.setupCompleted !== undefined) {
      profile.setupCompleted = dto.setupCompleted;
      if (dto.setupCompleted && !profile.setupCompletedAt) {
        profile.setupCompletedAt = now().toJSDate();
      }
    }
    if (dto.defaultBufferBeforeMinutes !== undefined) {
      profile.defaultBufferBeforeMinutes = dto.defaultBufferBeforeMinutes;
    }
    if (dto.defaultBufferAfterMinutes !== undefined) {
      profile.defaultBufferAfterMinutes = dto.defaultBufferAfterMinutes;
    }
    if (dto.workingHoursStart !== undefined) {
      profile.workingHoursStart = dto.workingHoursStart;
    }
    if (dto.workingHoursEnd !== undefined) {
      profile.workingHoursEnd = dto.workingHoursEnd;
    }
    if (dto.workingDays !== undefined) {
      profile.workingDays = dto.workingDays;
    }

    const saved = await this.repProfileRepo.save(profile);
    this.logger.log(`Rep profile updated for user ${userId}`);
    return saved;
  }

  async completeSetup(userId: number): Promise<RepProfile> {
    const profile = await this.profileByUserId(userId);
    if (!profile) {
      throw new Error("Profile not found. Please create a profile first.");
    }

    profile.setupCompleted = true;
    profile.setupCompletedAt = now().toJSDate();
    return this.repProfileRepo.save(profile);
  }

  async searchTermsForUser(userId: number): Promise<string[]> {
    const profile = await this.profileByUserId(userId);
    if (!profile) {
      return [];
    }

    const terms: string[] = [];

    if (profile.customSearchTerms && profile.customSearchTerms.length > 0) {
      terms.push(...profile.customSearchTerms);
    }

    return terms;
  }

  async scheduleSettings(userId: number): Promise<{
    bufferBeforeMinutes: number;
    bufferAfterMinutes: number;
    workingStartHour: number;
    workingStartMinute: number;
    workingEndHour: number;
    workingEndMinute: number;
    workingDays: number[];
  }> {
    const profile = await this.profileByUserId(userId);

    const parseTime = (timeStr: string): { hour: number; minute: number } => {
      const [hour, minute] = timeStr.split(":").map(Number);
      return { hour, minute };
    };

    const start = parseTime(profile?.workingHoursStart ?? "08:00");
    const end = parseTime(profile?.workingHoursEnd ?? "17:00");
    const days = (profile?.workingDays ?? "1,2,3,4,5").split(",").map(Number);

    return {
      bufferBeforeMinutes: profile?.defaultBufferBeforeMinutes ?? 15,
      bufferAfterMinutes: profile?.defaultBufferAfterMinutes ?? 15,
      workingStartHour: start.hour,
      workingStartMinute: start.minute,
      workingEndHour: end.hour,
      workingEndMinute: end.minute,
      workingDays: days,
    };
  }
}

import {
  isOrbitEducationApplicationStatus,
  type OrbitEducationApplicationStatus,
} from "@annix/product-data/orbit-education";
import { BadRequestException, Injectable } from "@nestjs/common";
import { EducationApplication } from "../entities/education-application.entity";
import { EducationApplicationRepository } from "../repositories/education-application.repository";
import { EducationConsentService } from "./education-consent.service";
import { EducationProfileService } from "./education-profile.service";

export interface CreateApplicationInput {
  institutionName: string;
  programmeName: string;
  programmeId?: string | null;
  status?: OrbitEducationApplicationStatus;
  notes?: string | null;
}

@Injectable()
export class EducationApplicationService {
  constructor(
    private readonly applicationRepo: EducationApplicationRepository,
    private readonly profileService: EducationProfileService,
    private readonly consentService: EducationConsentService,
  ) {}

  async listForUser(userId: number): Promise<EducationApplication[]> {
    const profile = await this.profileService.profileForUser(userId);
    if (!profile) return [];
    await this.consentService.assertProcessingAllowed(profile);
    return this.applicationRepo.orderedForProfile(profile.id);
  }

  async create(userId: number, input: CreateApplicationInput): Promise<EducationApplication> {
    const profile = await this.profileService.upsertProfile(userId, {});
    await this.consentService.assertProcessingAllowed(profile);
    const status = input.status ?? "interested";
    if (!isOrbitEducationApplicationStatus(status)) {
      throw new BadRequestException(`Unknown application status: ${status}`);
    }
    return this.applicationRepo.create({
      educationProfileId: profile.id,
      programmeId: input.programmeId ?? null,
      institutionName: input.institutionName,
      programmeName: input.programmeName,
      status,
      notes: input.notes ?? null,
    });
  }

  async updateStatus(
    userId: number,
    applicationId: string,
    status: string,
  ): Promise<EducationApplication | null> {
    if (!isOrbitEducationApplicationStatus(status)) {
      throw new BadRequestException(`Unknown application status: ${status}`);
    }
    const profile = await this.profileService.profileForUser(userId);
    if (!profile) return null;
    const application = await this.applicationRepo.findByIdForProfile(applicationId, profile.id);
    if (!application) return null;
    application.status = status;
    return this.applicationRepo.save(application);
  }

  async delete(userId: number, applicationId: string): Promise<boolean> {
    const profile = await this.profileService.profileForUser(userId);
    if (!profile) return false;
    const affected = await this.applicationRepo.deleteByIdForProfile(applicationId, profile.id);
    return affected > 0;
  }
}

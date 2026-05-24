import {
  isOrbitEducationApplicationStatus,
  type OrbitEducationApplicationStatus,
} from "@annix/product-data/orbit-education";
import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { EducationApplication } from "../entities/education-application.entity";
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
    @InjectRepository(EducationApplication)
    private readonly applicationRepo: Repository<EducationApplication>,
    private readonly profileService: EducationProfileService,
    private readonly consentService: EducationConsentService,
  ) {}

  async listForUser(userId: number): Promise<EducationApplication[]> {
    const profile = await this.profileService.profileForUser(userId);
    if (!profile) return [];
    await this.consentService.assertProcessingAllowed(profile);
    return this.applicationRepo.find({
      where: { educationProfileId: profile.id },
      order: { createdAt: "DESC" },
    });
  }

  async create(userId: number, input: CreateApplicationInput): Promise<EducationApplication> {
    const profile = await this.profileService.upsertProfile(userId, {});
    await this.consentService.assertProcessingAllowed(profile);
    const status = input.status ?? "interested";
    if (!isOrbitEducationApplicationStatus(status)) {
      throw new BadRequestException(`Unknown application status: ${status}`);
    }
    return this.applicationRepo.save(
      this.applicationRepo.create({
        educationProfileId: profile.id,
        programmeId: input.programmeId ?? null,
        institutionName: input.institutionName,
        programmeName: input.programmeName,
        status,
        notes: input.notes ?? null,
      }),
    );
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
    const application = await this.applicationRepo.findOne({
      where: { id: applicationId, educationProfileId: profile.id },
    });
    if (!application) return null;
    application.status = status;
    return this.applicationRepo.save(application);
  }

  async delete(userId: number, applicationId: string): Promise<boolean> {
    const profile = await this.profileService.profileForUser(userId);
    if (!profile) return false;
    const result = await this.applicationRepo.delete({
      id: applicationId,
      educationProfileId: profile.id,
    });
    return (result.affected ?? 0) > 0;
  }
}

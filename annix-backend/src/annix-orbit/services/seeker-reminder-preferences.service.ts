import { Injectable, NotFoundException } from "@nestjs/common";
import { UserRepository } from "../../user/user.repository";
import { AnnixOrbitProfileRepository } from "../repositories/annix-orbit-profile.repository";
import { CandidateRepository } from "../repositories/candidate.repository";
import { OrbitTierCapabilityRepository } from "../repositories/orbit-tier-capability.repository";

export interface ReminderPreferencesView {
  phone: string | null;
  interviewReminderEmail: boolean;
  interviewReminderSms: boolean;
  interviewReminderWhatsapp: boolean;
  multiChannelReminders: boolean;
}

export interface UpdateReminderPreferencesInput {
  phone?: string | null;
  interviewReminderEmail?: boolean;
  interviewReminderSms?: boolean;
  interviewReminderWhatsapp?: boolean;
}

function trimOrNull(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

@Injectable()
export class SeekerReminderPreferencesService {
  constructor(
    private readonly profileRepo: AnnixOrbitProfileRepository,
    private readonly userRepo: UserRepository,
    private readonly candidateRepo: CandidateRepository,
    private readonly tierCapabilityRepo: OrbitTierCapabilityRepository,
  ) {}

  async get(userId: number): Promise<ReminderPreferencesView> {
    const profile = await this.profileRepo.findByUserId(userId);
    if (!profile) {
      throw new NotFoundException("Profile not found");
    }
    const multiChannelReminders = await this.resolveMultiChannel(userId);
    return {
      phone: profile.phone ? profile.phone : null,
      interviewReminderEmail: profile.interviewReminderEmail !== false,
      interviewReminderSms: profile.interviewReminderSms === true,
      interviewReminderWhatsapp: profile.interviewReminderWhatsapp === true,
      multiChannelReminders,
    };
  }

  async update(
    userId: number,
    input: UpdateReminderPreferencesInput,
  ): Promise<ReminderPreferencesView> {
    const profile = await this.profileRepo.findByUserId(userId);
    if (!profile) {
      throw new NotFoundException("Profile not found");
    }
    if (input.phone !== undefined) {
      profile.phone = trimOrNull(input.phone);
    }
    if (input.interviewReminderEmail !== undefined) {
      profile.interviewReminderEmail = input.interviewReminderEmail;
    }
    if (input.interviewReminderSms !== undefined) {
      profile.interviewReminderSms = input.interviewReminderSms;
    }
    if (input.interviewReminderWhatsapp !== undefined) {
      profile.interviewReminderWhatsapp = input.interviewReminderWhatsapp;
    }
    await this.profileRepo.save(profile);
    return this.get(userId);
  }

  private async resolveMultiChannel(userId: number): Promise<boolean> {
    const user = await this.userRepo.findById(userId);
    if (!user) return false;
    const candidates = await this.candidateRepo.findByEmail(user.email);
    const tier = candidates.length > 0 ? candidates[0].matchTier : null;
    if (!tier) return false;
    const capability = await this.tierCapabilityRepo.findByTier(tier);
    const features = capability ? capability.features : null;
    return features ? features.multiChannelReminders === true : false;
  }
}

import { DEFAULT_MATCH_TIER, isMatchTier } from "@annix/product-data/sa-market";
import { Injectable, NotFoundException } from "@nestjs/common";
import { now } from "../../lib/datetime";
import { UserRepository } from "../../user/user.repository";
import { isAnnixOrbitBillingEnforced } from "../annix-orbit-billing.config";
import { isOrbitBillingStatus, resolveEntitledTier } from "../lib/seeker-entitlement";
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
    const profile = await this.profileRepo.findByUserId(userId);
    const candidates = await this.candidateRepo.findByEmail(user.email);
    const candidate = candidates.length > 0 ? candidates[0] : null;
    if (!candidate && !profile) return false;
    const tier = resolveEntitledTier({
      requestedTier:
        profile?.selectedTier && isMatchTier(profile.selectedTier)
          ? profile.selectedTier
          : (candidate?.matchTier ?? DEFAULT_MATCH_TIER),
      trialTier: candidate?.trialTier ?? null,
      trialEndsAt: candidate?.trialEndsAt ?? null,
      entitledTier: profile?.entitledTier ?? null,
      billingStatus:
        profile && isOrbitBillingStatus(profile.billingStatus) ? profile.billingStatus : null,
      paidUntil: profile?.paidUntil ?? null,
      enforced: isAnnixOrbitBillingEnforced(),
      nowMillis: now().toMillis(),
    });
    const capability = await this.tierCapabilityRepo.findByTier(tier);
    const features = capability ? capability.features : null;
    return features ? features.multiChannelReminders === true : false;
  }
}

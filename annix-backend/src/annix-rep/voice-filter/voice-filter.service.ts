import { Injectable, Logger } from "@nestjs/common";
import { now } from "../../lib/datetime";
import { UpsertVoiceProfileDto } from "./voice-filter.dto";
import { VoiceProfile } from "./voice-filter.entity";
import { VoiceProfileRepository } from "./voice-filter.repository";

@Injectable()
export class VoiceFilterService {
  private readonly logger = new Logger(VoiceFilterService.name);

  constructor(private readonly voiceProfileRepo: VoiceProfileRepository) {}

  async profileByUserId(userId: number): Promise<VoiceProfile | null> {
    return this.voiceProfileRepo.findByUserId(userId);
  }

  async upsertProfile(userId: number, dto: UpsertVoiceProfileDto): Promise<VoiceProfile> {
    const existing = await this.profileByUserId(userId);
    const enrolledAt = dto.enrolled ? (existing?.enrolledAt ?? now().toJSDate()) : null;

    if (!existing) {
      const created = await this.voiceProfileRepo.create({
        userId,
        enrolled: dto.enrolled,
        awsSpeakerId: dto.awsSpeakerId ?? null,
        awsDomainId: dto.awsDomainId ?? null,
        enrolledAt,
      });
      this.logger.log(`Voice profile created for user ${userId}`);
      return created;
    }

    existing.enrolled = dto.enrolled;
    existing.awsSpeakerId = dto.awsSpeakerId ?? existing.awsSpeakerId ?? null;
    existing.awsDomainId = dto.awsDomainId ?? existing.awsDomainId ?? null;
    existing.enrolledAt = enrolledAt;
    const saved = await this.voiceProfileRepo.save(existing);
    this.logger.log(`Voice profile updated for user ${userId}`);
    return saved;
  }

  async resetProfile(userId: number): Promise<VoiceProfile | null> {
    const existing = await this.profileByUserId(userId);
    if (!existing) {
      return null;
    }

    existing.enrolled = false;
    existing.awsSpeakerId = null;
    existing.awsDomainId = null;
    existing.enrolledAt = null;
    const saved = await this.voiceProfileRepo.save(existing);
    this.logger.log(`Voice profile reset for user ${userId}`);
    return saved;
  }
}

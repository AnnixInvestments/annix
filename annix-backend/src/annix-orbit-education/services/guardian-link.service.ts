import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { now } from "../../lib/datetime";
import {
  GUARDIAN_LINK_STATUSES,
  type GuardianLinkStatus,
} from "../annix-orbit-education.constants";
import { GuardianLink } from "../entities/guardian-link.entity";
import { GuardianLinkRepository } from "../repositories/guardian-link.repository";

@Injectable()
export class GuardianLinkService {
  private readonly logger = new Logger(GuardianLinkService.name);

  constructor(private readonly guardianLinkRepo: GuardianLinkRepository) {}

  async linksForProfile(educationProfileId: string): Promise<GuardianLink[]> {
    return this.guardianLinkRepo.orderedForProfile(educationProfileId);
  }

  async invite(educationProfileId: string, guardianEmail: string): Promise<GuardianLink> {
    const normalisedEmail = guardianEmail.trim().toLowerCase();
    if (normalisedEmail.length === 0) {
      throw new BadRequestException("A guardian email is required");
    }
    const existing = await this.guardianLinkRepo.findByProfileAndEmail(
      educationProfileId,
      normalisedEmail,
    );
    if (existing && existing.status !== "declined" && existing.status !== "revoked") {
      return existing;
    }
    const saved = await this.guardianLinkRepo.create({
      educationProfileId,
      guardianEmail: normalisedEmail,
      status: "invited",
      invitedAt: now().toJSDate(),
    });
    this.logger.log(
      `Invited guardian ${normalisedEmail} to education profile ${educationProfileId}`,
    );
    return saved;
  }

  async updateStatus(
    linkId: string,
    status: GuardianLinkStatus,
    guardianUserId: number | null,
  ): Promise<GuardianLink | null> {
    if (!GUARDIAN_LINK_STATUSES.includes(status)) {
      throw new BadRequestException(`Unknown guardian link status: ${status}`);
    }
    const link = await this.guardianLinkRepo.findById(linkId);
    if (!link) return null;
    link.status = status;
    if (status === "accepted") {
      link.acceptedAt = now().toJSDate();
      link.guardianUserId = guardianUserId;
    }
    return this.guardianLinkRepo.save(link);
  }
}

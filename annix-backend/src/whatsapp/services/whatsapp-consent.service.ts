import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { now } from "../../lib/datetime";
import { UserRepository } from "../../user/user.repository";
import { isConsentReply } from "../consent-template";
import { createConsentToken, verifyConsentToken } from "../consent-token";
import type { WhatsAppConsentContext, WhatsAppConsentResult } from "../dto/whatsapp-consent.dto";
import { normalizeWaId } from "../wa-id";

export function maskEmail(email: string): string {
  const atIndex = email.indexOf("@");
  if (atIndex <= 0) {
    return "***";
  }
  const localPart = email.slice(0, atIndex);
  const domain = email.slice(atIndex + 1);
  const visible = localPart.slice(0, 1);
  return `${visible}***@${domain}`;
}

@Injectable()
export class WhatsAppConsentService {
  private readonly logger = new Logger(WhatsAppConsentService.name);

  constructor(
    private readonly userRepo: UserRepository,
    private readonly configService: ConfigService,
  ) {}

  private secret(): string {
    return this.configService.get<string>("JWT_SECRET") || "";
  }

  createToken(userId: number, ttlDays = 7): string {
    return createConsentToken(userId, this.secret(), ttlDays);
  }

  consentLink(token: string): string {
    const frontendUrl = this.configService.get<string>("FRONTEND_URL") || "http://localhost:3000";
    return `${frontendUrl}/whatsapp-consent/${token}`;
  }

  async context(token: string): Promise<WhatsAppConsentContext> {
    const verified = verifyConsentToken(token, this.secret());
    if (!verified) {
      throw new BadRequestException("This consent link is invalid or has expired.");
    }
    const user = await this.userRepo.findById(verified.userId);
    if (!user) {
      throw new BadRequestException("This consent link is invalid or has expired.");
    }
    return {
      firstName: user.firstName ?? null,
      maskedEmail: maskEmail(user.email),
      currentPhone: user.whatsappPhone ?? null,
      alreadyOptedIn: user.whatsappOptIn === true,
    };
  }

  async submit(
    token: string,
    input: { whatsappPhone: string; consent: boolean },
  ): Promise<WhatsAppConsentResult> {
    const verified = verifyConsentToken(token, this.secret());
    if (!verified) {
      throw new BadRequestException("This consent link is invalid or has expired.");
    }
    if (input.consent !== true) {
      throw new BadRequestException("Consent is required to opt in to WhatsApp updates.");
    }
    const normalizedPhone = normalizeWaId(input.whatsappPhone);
    if (!normalizedPhone) {
      throw new BadRequestException("Please enter a valid WhatsApp phone number.");
    }
    const user = await this.userRepo.findById(verified.userId);
    if (!user) {
      throw new BadRequestException("This consent link is invalid or has expired.");
    }
    user.whatsappPhone = normalizedPhone;
    user.whatsappOptIn = true;
    user.whatsappOptInAt = now().toJSDate();
    await this.userRepo.save(user);
    this.logger.log(`User ${user.id} opted in to WhatsApp via consent link`);
    return { optedIn: true };
  }

  async handleInboundConsentReply(waId: string, body: string): Promise<void> {
    if (!isConsentReply(body)) {
      return;
    }
    const normalized = normalizeWaId(waId);
    if (!normalized) {
      return;
    }
    const user = await this.userRepo.findOneByWhatsAppPhone(normalized);
    if (!user) {
      return;
    }
    if (
      user.whatsappOptIn === true &&
      user.whatsappVerifiedAt != null &&
      user.whatsappVerifiedPhone === normalized
    ) {
      return;
    }
    const claimedByOther = await this.userRepo.findOneByVerifiedWhatsAppPhone(normalized);
    if (claimedByOther && claimedByOther.id !== user.id) {
      this.logger.warn(
        `Refused WhatsApp verification for user ${user.id}: ${normalized} is already verified-bound to user ${claimedByOther.id}`,
      );
      return;
    }
    const timestamp = now().toJSDate();
    if (user.whatsappOptIn !== true) {
      user.whatsappOptIn = true;
      user.whatsappOptInAt = timestamp;
    }
    user.whatsappVerifiedAt = timestamp;
    user.whatsappVerifiedPhone = normalized;
    await this.userRepo.save(user);
    this.logger.log(`User ${user.id} verified WhatsApp control via quick-reply consent button`);
  }
}

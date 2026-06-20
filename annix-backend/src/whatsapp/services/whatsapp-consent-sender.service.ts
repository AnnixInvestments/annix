import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { isEmpty } from "es-toolkit/compat";
import { AnnixOrbitProfileRepository } from "../../annix-orbit/repositories/annix-orbit-profile.repository";
import { CandidateRepository } from "../../annix-orbit/repositories/candidate.repository";
import { now } from "../../lib/datetime";
import { RbacService } from "../../rbac/rbac.service";
import { UserRepository } from "../../user/user.repository";
import {
  WHATSAPP_CONSENT_TEMPLATE_LANG,
  WHATSAPP_CONSENT_TEMPLATE_NAME,
} from "../consent-template";
import type { WhatsAppConsentChannel } from "../dto/request-whatsapp-consent.dto";
import { normalizeWaId } from "../wa-id";
import { WhatsAppCloudApiService } from "./whatsapp-cloud-api.service";
import { WhatsAppConversationService } from "./whatsapp-conversation.service";

const CONSENT_APP_CONTEXT = "admin-consent";

export type RequestConsentResult =
  | { requested: true; channel: "email"; sentTo: string }
  | { requested: true; channel: "whatsapp"; sentTo: string };

@Injectable()
export class WhatsAppConsentSenderService {
  private readonly logger = new Logger(WhatsAppConsentSenderService.name);

  constructor(
    private readonly rbacService: RbacService,
    private readonly userRepo: UserRepository,
    private readonly orbitProfileRepo: AnnixOrbitProfileRepository,
    private readonly candidateRepo: CandidateRepository,
    private readonly cloudApi: WhatsAppCloudApiService,
    private readonly conversations: WhatsAppConversationService,
  ) {}

  async requestConsent(
    userId: number,
    channel: WhatsAppConsentChannel,
  ): Promise<RequestConsentResult> {
    if (channel === "whatsapp") {
      return this.requestViaWhatsApp(userId);
    }
    const result = await this.rbacService.requestWhatsAppConsent(userId);
    return { requested: true, channel: "email", sentTo: result.sentTo };
  }

  private async requestViaWhatsApp(userId: number): Promise<RequestConsentResult> {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new NotFoundException("User not found");
    }

    const waId = await this.resolveWhatsAppNumber(
      user.id,
      user.whatsappPhone ?? null,
      user.email ?? null,
    );
    if (!waId) {
      throw new BadRequestException("No WhatsApp number on file for this user.");
    }

    if (isEmpty(user.whatsappPhone)) {
      user.whatsappPhone = waId;
    }

    const firstName = isEmpty(user.firstName) ? null : (user.firstName as string);
    const result = await this.cloudApi.sendTemplate(
      waId,
      WHATSAPP_CONSENT_TEMPLATE_NAME,
      WHATSAPP_CONSENT_TEMPLATE_LANG,
      [firstName ?? "there"],
    );

    await this.conversations.recordOutbound(waId, {
      body: "WhatsApp consent request",
      waMessageId: result.waMessageId,
      appContext: CONSENT_APP_CONTEXT,
      sentBy: null,
    });

    user.whatsappConsentRequestedAt = now().toJSDate();
    await this.userRepo.save(user);
    this.logger.log(`WhatsApp consent request template sent to user ${userId} (${waId})`);

    return { requested: true, channel: "whatsapp", sentTo: waId };
  }

  private async resolveWhatsAppNumber(
    userId: number,
    storedPhone: string | null,
    email: string | null,
  ): Promise<string | null> {
    if (!isEmpty(storedPhone)) {
      return storedPhone as string;
    }
    const profile = await this.orbitProfileRepo.findByUserId(userId);
    const profilePhone = normalizeWaId(profile?.phone ?? null);
    if (profilePhone) {
      return profilePhone;
    }
    // Last resort: the contact number Nix extracted from their CV. Lets the admin
    // request consent from seekers who never set a profile phone.
    if (isEmpty(email)) {
      return null;
    }
    const candidates = await this.candidateRepo.findByEmail(email as string);
    const cvPhone = candidates
      .map((candidate) => (candidate.extractedData ? candidate.extractedData.phone : null))
      .find((phone) => !isEmpty(phone));
    return normalizeWaId(cvPhone ?? null);
  }
}

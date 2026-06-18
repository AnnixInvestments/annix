import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { isEmpty } from "es-toolkit/compat";
import { AnnixOrbitProfileRepository } from "../../annix-orbit/repositories/annix-orbit-profile.repository";
import { ExtractionMetricService } from "../../metrics/extraction-metric.service";
import { RbacService } from "../../rbac/rbac.service";
import { UserRepository } from "../../user/user.repository";
import type { BroadcastSendMode } from "../dto/broadcast-send-one.dto";
import { normalizeWaId } from "../wa-id";
import { WhatsAppCloudApiService } from "./whatsapp-cloud-api.service";
import { WhatsAppConversationService } from "./whatsapp-conversation.service";

const BROADCAST_APP_CONTEXT = "admin-broadcast";
const DEFAULT_TEMPLATE_LANGUAGE = "en";
const METRIC_CATEGORY = "whatsapp";
const METRIC_OPERATION = "broadcast-send";

export interface BroadcastCandidate {
  userId: number;
  firstName: string | null;
  whatsappPhone: string;
  whatsappOptIn: boolean;
  appScope: string | null;
}

export interface BroadcastCandidatesResult {
  candidates: BroadcastCandidate[];
  totalCandidates: number;
  optedInCount: number;
}

export interface BroadcastSendResult {
  userId: number;
  status: "sent" | "failed";
  waMessageId?: string | null;
  error?: string;
}

export interface BroadcastSendInput {
  userId: number;
  message: string;
  mode: BroadcastSendMode;
  templateName: string | null;
  languageCode: string | null;
  sentBy: string | null;
}

export interface BackfillPhonesResult {
  updated: number;
  totalUsersWithPhone: number;
}

@Injectable()
export class WhatsAppBroadcastService {
  private readonly logger = new Logger(WhatsAppBroadcastService.name);

  constructor(
    private readonly rbacService: RbacService,
    private readonly userRepo: UserRepository,
    private readonly orbitProfileRepo: AnnixOrbitProfileRepository,
    private readonly cloudApi: WhatsAppCloudApiService,
    private readonly conversations: WhatsAppConversationService,
    private readonly metrics: ExtractionMetricService,
  ) {}

  async candidates(appCode: string | null): Promise<BroadcastCandidatesResult> {
    const userIds = appCode === null ? null : await this.rbacService.userIdsForApp(appCode);

    if (userIds !== null && userIds.length === 0) {
      return { candidates: [], totalCandidates: 0, optedInCount: 0 };
    }

    const users = await this.userRepo.findWhatsAppCandidates(userIds);

    const candidates: BroadcastCandidate[] = users
      .filter((user) => !isEmpty(user.whatsappPhone))
      .map((user) => ({
        userId: user.id,
        firstName: user.firstName ?? null,
        whatsappPhone: user.whatsappPhone as string,
        whatsappOptIn: user.whatsappOptIn ?? false,
        appScope: user.appScope ?? null,
      }));

    const optedInCount = candidates.filter((candidate) => candidate.whatsappOptIn).length;

    return { candidates, totalCandidates: candidates.length, optedInCount };
  }

  async backfillPhones(): Promise<BackfillPhonesResult> {
    const profilePairs = await this.orbitProfileRepo.userPhonePairs();
    if (profilePairs.length === 0) {
      const totalUsersWithPhone = await this.userRepo.countWithWhatsAppPhone();
      return { updated: 0, totalUsersWithPhone };
    }

    const phoneByOrbitUserId = profilePairs.reduce((map, pair) => {
      const normalized = normalizeWaId(pair.phone);
      if (normalized !== null && !map.has(pair.userId)) {
        map.set(pair.userId, normalized);
      }
      return map;
    }, new Map<number, string>());

    const orbitUserIds = Array.from(phoneByOrbitUserId.keys());
    const emails = await this.userRepo.findEmailsByIds(orbitUserIds);

    const phoneByEmail = emails.reduce((map, row) => {
      const phone = phoneByOrbitUserId.get(row.id);
      const key = row.email.toLowerCase();
      if (phone && !map.has(key)) {
        map.set(key, { email: row.email, phone });
      }
      return map;
    }, new Map<string, { email: string; phone: string }>());

    const updatedCounts = await Promise.all(
      Array.from(phoneByEmail.values()).map((entry) =>
        this.userRepo.setWhatsAppPhoneWhereMissingByEmail(entry.email, entry.phone),
      ),
    );

    const updated = updatedCounts.reduce((sum, count) => sum + count, 0);
    const totalUsersWithPhone = await this.userRepo.countWithWhatsAppPhone();

    this.logger.log(`Orbit phone backfill set whatsappPhone on ${updated} user(s)`);

    return { updated, totalUsersWithPhone };
  }

  async sendOne(input: BroadcastSendInput): Promise<BroadcastSendResult> {
    const user = await this.userRepo.findById(input.userId);
    if (!user) {
      throw new NotFoundException("User not found");
    }
    if (isEmpty(user.whatsappPhone)) {
      throw new NotFoundException("This user has no WhatsApp phone number on file.");
    }
    if (!user.whatsappOptIn) {
      throw new BadRequestException(
        "This user has not opted in to WhatsApp messaging, so we cannot send to them.",
      );
    }

    const phone = user.whatsappPhone as string;
    const firstName = isEmpty(user.firstName) ? null : (user.firstName as string);

    try {
      return await this.metrics.time(METRIC_CATEGORY, METRIC_OPERATION, () =>
        this.deliver(input, phone, firstName),
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Something went wrong — please try again.";
      this.logger.warn(`Broadcast send to user ${input.userId} failed: ${message}`);
      return { userId: input.userId, status: "failed", error: message };
    }
  }

  private async deliver(
    input: BroadcastSendInput,
    phone: string,
    firstName: string | null,
  ): Promise<BroadcastSendResult> {
    if (input.mode === "template") {
      if (isEmpty(input.templateName)) {
        throw new BadRequestException("A template name is required for template sends.");
      }
      const languageCode = input.languageCode ?? DEFAULT_TEMPLATE_LANGUAGE;
      const result = await this.cloudApi.sendTemplate(
        phone,
        input.templateName as string,
        languageCode,
        [firstName ?? "there", input.message],
      );
      await this.conversations.recordOutbound(phone, {
        body: input.message,
        waMessageId: result.waMessageId,
        appContext: BROADCAST_APP_CONTEXT,
        sentBy: input.sentBy,
      });
      return { userId: input.userId, status: "sent", waMessageId: result.waMessageId };
    }

    const greeting = firstName ? `Hi ${firstName}, ` : "Hi there, ";
    const body = `${greeting}${input.message}`;
    const result = await this.cloudApi.sendText(phone, body);
    await this.conversations.recordOutbound(phone, {
      body,
      waMessageId: result.waMessageId,
      appContext: BROADCAST_APP_CONTEXT,
      sentBy: input.sentBy,
    });
    return { userId: input.userId, status: "sent", waMessageId: result.waMessageId };
  }
}

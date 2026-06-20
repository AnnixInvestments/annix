import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { now } from "../../lib/datetime";
import type { WhatsAppConversation } from "../entities/whatsapp-conversation.entity";
import type { WhatsAppMessage } from "../entities/whatsapp-message.entity";
import { WhatsAppConversationRepository } from "../repositories/whatsapp-conversation.repository";
import { WhatsAppMessageRepository } from "../repositories/whatsapp-message.repository";
import { WhatsAppCloudApiService } from "./whatsapp-cloud-api.service";

const CONVERSATION_PAGE_SIZE = 20;
const MESSAGE_HISTORY_LIMIT = 200;
const PREVIEW_MAX_LENGTH = 120;

export interface InboundMessageInput {
  waId: string;
  profileName: string | null;
  body: string;
  messageType: string;
  waMessageId: string | null;
  sentAt: Date;
}

export interface OutboundRecordInput {
  body: string;
  waMessageId: string | null;
  appContext: string | null;
  sentBy: string | null;
}

export interface ConversationListResult {
  items: WhatsAppConversation[];
  total: number;
  page: number;
  pageSize: number;
}

function preview(body: string): string {
  const trimmed = body.trim();
  return trimmed.length > PREVIEW_MAX_LENGTH
    ? `${trimmed.slice(0, PREVIEW_MAX_LENGTH - 1)}…`
    : trimmed;
}

@Injectable()
export class WhatsAppConversationService {
  private readonly logger = new Logger(WhatsAppConversationService.name);

  constructor(
    private readonly conversationRepo: WhatsAppConversationRepository,
    private readonly messageRepo: WhatsAppMessageRepository,
    private readonly cloudApi: WhatsAppCloudApiService,
  ) {}

  status(): {
    configured: boolean;
    phoneNumberId: string | null;
    broadcastTemplateName: string;
    broadcastTemplateLanguage: string;
  } {
    return {
      configured: this.cloudApi.isConfigured(),
      phoneNumberId: this.cloudApi.configuredPhoneNumberId(),
      broadcastTemplateName: this.cloudApi.broadcastTemplateName(),
      broadcastTemplateLanguage: this.cloudApi.broadcastTemplateLanguage(),
    };
  }

  async listConversations(page: number): Promise<ConversationListResult> {
    const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
    const [items, total] = await Promise.all([
      this.conversationRepo.listByRecency(safePage, CONVERSATION_PAGE_SIZE),
      this.conversationRepo.count(),
    ]);
    return { items, total, page: safePage, pageSize: CONVERSATION_PAGE_SIZE };
  }

  async messages(conversationId: string): Promise<WhatsAppMessage[]> {
    const conversation = await this.conversationRepo.findById(conversationId);
    if (!conversation) {
      throw new NotFoundException("Conversation not found");
    }
    return this.messageRepo.findByConversationOrdered(conversationId, MESSAGE_HISTORY_LIMIT);
  }

  async markRead(conversationId: string): Promise<void> {
    const conversation = await this.conversationRepo.findById(conversationId);
    if (!conversation) {
      throw new NotFoundException("Conversation not found");
    }
    if (conversation.unreadCount !== 0) {
      conversation.unreadCount = 0;
      await this.conversationRepo.save(conversation);
    }
  }

  async recordInbound(input: InboundMessageInput): Promise<void> {
    if (input.waMessageId) {
      const existing = await this.messageRepo.findByWaMessageId(input.waMessageId);
      if (existing) {
        return;
      }
    }

    const conversation = await this.upsertConversation(input.waId, input.profileName);
    conversation.lastMessageAt = input.sentAt;
    conversation.lastMessagePreview = preview(input.body);
    conversation.lastDirection = "inbound";
    conversation.unreadCount = (conversation.unreadCount ?? 0) + 1;
    if (input.profileName) {
      conversation.profileName = input.profileName;
    }
    await this.conversationRepo.save(conversation);

    await this.messageRepo.create({
      conversationId: conversation.id,
      direction: "inbound",
      body: input.body,
      messageType: input.messageType,
      waMessageId: input.waMessageId,
      status: "received",
      errorDetail: null,
      appContext: conversation.appContext,
      sentBy: null,
      sentAt: input.sentAt,
    });
  }

  async recordOutbound(waId: string, input: OutboundRecordInput): Promise<void> {
    const conversation = await this.upsertConversation(waId, null);
    conversation.lastMessageAt = now().toJSDate();
    conversation.lastMessagePreview = preview(input.body);
    conversation.lastDirection = "outbound";
    if (input.appContext) {
      conversation.appContext = input.appContext;
    }
    await this.conversationRepo.save(conversation);

    await this.messageRepo.create({
      conversationId: conversation.id,
      direction: "outbound",
      body: input.body,
      messageType: "text",
      waMessageId: input.waMessageId,
      status: "sent",
      errorDetail: null,
      appContext: input.appContext,
      sentBy: input.sentBy,
      sentAt: now().toJSDate(),
    });
  }

  async sendReply(
    conversationId: string,
    body: string,
    sentBy: string | null,
  ): Promise<WhatsAppMessage[]> {
    const conversation = await this.conversationRepo.findById(conversationId);
    if (!conversation) {
      throw new NotFoundException("Conversation not found");
    }
    const result = await this.cloudApi.sendText(conversation.waId, body);
    await this.recordOutbound(conversation.waId, {
      body,
      waMessageId: result.waMessageId,
      appContext: "admin-inbox",
      sentBy,
    });
    return this.messageRepo.findByConversationOrdered(conversationId, MESSAGE_HISTORY_LIMIT);
  }

  async updateMessageStatus(
    waMessageId: string,
    status: string,
    errorDetail: string | null,
  ): Promise<void> {
    const message = await this.messageRepo.findByWaMessageId(waMessageId);
    if (!message) {
      return;
    }
    message.status = status;
    if (errorDetail) {
      message.errorDetail = errorDetail.slice(0, 500);
    }
    await this.messageRepo.save(message);
  }

  private async upsertConversation(
    waId: string,
    profileName: string | null,
  ): Promise<WhatsAppConversation> {
    const existing = await this.conversationRepo.findByWaId(waId);
    if (existing) {
      return existing;
    }
    this.logger.log(`Opening new WhatsApp conversation for ${waId}`);
    return this.conversationRepo.create({
      waId,
      profileName,
      lastMessageAt: now().toJSDate(),
      lastMessagePreview: null,
      lastDirection: "inbound",
      unreadCount: 0,
      appContext: null,
    });
  }
}

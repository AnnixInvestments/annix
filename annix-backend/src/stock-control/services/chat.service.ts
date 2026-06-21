import { ForbiddenException, Inject, Injectable, Logger } from "@nestjs/common";
import { now } from "../../lib/datetime";
import { IStorageService, STORAGE_SERVICE, StorageArea } from "../../storage/storage.interface";
import { ChatConversation } from "../entities/chat-conversation.entity";
import { ChatMessage } from "../entities/chat-message.entity";
import { ChatConversationRepository } from "../repositories/chat-conversation.repository";
import { ChatConversationParticipantRepository } from "../repositories/chat-conversation-participant.repository";
import { ChatMessageRepository } from "../repositories/chat-message.repository";
import { StockControlUserRepository } from "../repositories/stock-control-user.repository";

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    private readonly chatRepo: ChatMessageRepository,
    private readonly conversationRepo: ChatConversationRepository,
    private readonly participantRepo: ChatConversationParticipantRepository,
    private readonly userRepo: StockControlUserRepository,
    @Inject(STORAGE_SERVICE)
    private readonly storageService: IStorageService,
  ) {}

  private async assertParticipant(conversationId: number, userId: number): Promise<void> {
    const isParticipant = await this.participantRepo.isParticipant(conversationId, userId);
    if (!isParticipant) {
      throw new ForbiddenException("You are not a participant of this conversation");
    }
  }

  async messages(
    companyId: number,
    userId: number,
    afterId: number | null,
    conversationId: number | null = null,
    limit: number = 50,
  ): Promise<ChatMessage[]> {
    if (conversationId !== null) {
      await this.assertParticipant(conversationId, userId);
    }
    return this.chatRepo.findMessages(companyId, afterId, conversationId, limit);
  }

  async send(
    companyId: number,
    senderId: number,
    senderName: string,
    text: string,
    imageUrl: string | null,
    conversationId: number | null = null,
  ): Promise<ChatMessage> {
    if (conversationId !== null) {
      await this.assertParticipant(conversationId, senderId);
    }

    const saved = await this.chatRepo.create({
      companyId,
      senderId,
      senderName,
      text: text.trim(),
      imageUrl,
      conversationId,
    });

    if (conversationId !== null) {
      await this.conversationRepo.touchLastMessageAt(conversationId, now().toJSDate());
    }

    return saved;
  }

  async update(messageId: number, senderId: number, text: string): Promise<{ success: boolean }> {
    const message = await this.chatRepo.findById(messageId);

    if (!message || message.senderId !== senderId) {
      return { success: false };
    }

    message.text = text.trim();
    message.editedAt = now().toJSDate();
    await this.chatRepo.save(message);

    return { success: true };
  }

  async uploadImage(companyId: number, file: Express.Multer.File): Promise<{ imageUrl: string }> {
    const subPath = `${StorageArea.STOCK_CONTROL}/chat/${companyId}`;
    const result = await this.storageService.upload(file, subPath);
    const presignedUrl = await this.storageService.presignedUrl(result.path, 86400);

    return { imageUrl: presignedUrl };
  }

  async conversations(companyId: number, userId: number): Promise<ChatConversation[]> {
    const conversationIds = await this.participantRepo.findConversationIdsForUser(userId);

    if (conversationIds.length === 0) {
      return [];
    }

    return this.conversationRepo.findForCompanyByIds(conversationIds, companyId);
  }

  async createConversation(
    companyId: number,
    createdById: number,
    participantUserIds: number[],
    name: string | null,
  ): Promise<ChatConversation> {
    const allParticipantIds = Array.from(new Set([createdById, ...participantUserIds]));

    const companyUsers = await this.userRepo.findIdsByIdsForCompany(allParticipantIds, companyId);
    const companyUserIds = new Set(companyUsers.map((user) => user.id));
    const foreignParticipantIds = allParticipantIds.filter((id) => !companyUserIds.has(id));
    if (foreignParticipantIds.length > 0) {
      throw new ForbiddenException("All participants must belong to your company");
    }

    const type = allParticipantIds.length === 2 ? "direct" : "group";

    if (type === "direct") {
      const existing = await this.conversationRepo.findExistingDirectConversation(
        companyId,
        allParticipantIds[0],
        allParticipantIds[1],
      );
      if (existing) {
        return existing;
      }
    }

    const saved = await this.conversationRepo.create({
      companyId,
      type,
      name: type === "group" ? name : null,
      createdById,
    });

    await this.participantRepo.createMany(
      allParticipantIds.map((userId) => ({
        conversationId: saved.id,
        userId,
      })),
    );

    return this.conversationRepo.findByIdWithParticipantsOrFail(saved.id);
  }

  async markRead(conversationId: number, userId: number): Promise<void> {
    await this.assertParticipant(conversationId, userId);
    await this.participantRepo.touchLastReadAt(conversationId, userId, now().toJSDate());
  }

  async unreadCounts(companyId: number, userId: number): Promise<Record<string, number>> {
    const participantRows = await this.participantRepo.findForUser(userId);

    if (participantRows.length === 0) {
      return {};
    }

    const counts: Record<string, number> = {};

    const countPromises = participantRows.map(async (p) => {
      const count = await this.chatRepo.countUnreadForConversation(
        companyId,
        p.conversationId,
        userId,
        p.lastReadAt,
      );
      if (count > 0) {
        counts[String(p.conversationId)] = count;
      }
    });

    await Promise.all(countPromises);

    return counts;
  }

  async generalUnreadCount(companyId: number, lastReadMessageId: number | null): Promise<number> {
    return this.chatRepo.countGeneralUnread(companyId, lastReadMessageId);
  }
}

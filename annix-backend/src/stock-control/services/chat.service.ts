import { Inject, Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { now } from "../../lib/datetime";
import { IStorageService, STORAGE_SERVICE, StorageArea } from "../../storage/storage.interface";
import { ChatConversation } from "../entities/chat-conversation.entity";
import { ChatConversationParticipant } from "../entities/chat-conversation-participant.entity";
import { ChatMessage } from "../entities/chat-message.entity";

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    @InjectRepository(ChatMessage)
    private readonly chatRepo: Repository<ChatMessage>,
    @InjectRepository(ChatConversation)
    private readonly conversationRepo: Repository<ChatConversation>,
    @InjectRepository(ChatConversationParticipant)
    private readonly participantRepo: Repository<ChatConversationParticipant>,
    @Inject(STORAGE_SERVICE)
    private readonly storageService: IStorageService,
  ) {}

  async messages(
    companyId: number,
    afterId: number | null,
    conversationId: number | null = null,
    limit: number = 50,
  ): Promise<ChatMessage[]> {
    const qb = this.chatRepo
      .createQueryBuilder("msg")
      .where("msg.companyId = :companyId", { companyId })
      .orderBy("msg.createdAt", "ASC");

    if (conversationId !== null) {
      qb.andWhere("msg.conversationId = :conversationId", { conversationId });
    } else {
      qb.andWhere("msg.conversationId IS NULL");
    }

    if (afterId !== null) {
      const cursorMsg = await this.chatRepo.findOne({ where: { id: afterId } });
      if (cursorMsg) {
        qb.andWhere("msg.createdAt > :cursor", { cursor: cursorMsg.createdAt });
      }
    }

    return qb.take(limit).getMany();
  }

  async send(
    companyId: number,
    senderId: number,
    senderName: string,
    text: string,
    imageUrl: string | null,
    conversationId: number | null = null,
  ): Promise<ChatMessage> {
    const message = this.chatRepo.create({
      companyId,
      senderId,
      senderName,
      text: text.trim(),
      imageUrl,
      conversationId,
    });

    const saved = await this.chatRepo.save(message);

    if (conversationId !== null) {
      await this.conversationRepo.update(conversationId, {
        lastMessageAt: now().toJSDate(),
      });
    }

    return saved;
  }

  async update(messageId: number, senderId: number, text: string): Promise<{ success: boolean }> {
    const message = await this.chatRepo.findOne({ where: { id: messageId } });

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
    const participantRows = await this.participantRepo.find({
      where: { userId },
      select: ["conversationId"],
    });
    const conversationIds = participantRows.map((p) => p.conversationId);

    if (conversationIds.length === 0) {
      return [];
    }

    return this.conversationRepo.find({
      where: { id: In(conversationIds), companyId },
      relations: ["participants", "participants.user"],
      order: { lastMessageAt: { direction: "DESC", nulls: "LAST" } },
    });
  }

  async createConversation(
    companyId: number,
    createdById: number,
    participantUserIds: number[],
    name: string | null,
  ): Promise<ChatConversation> {
    const allParticipantIds = Array.from(new Set([createdById, ...participantUserIds]));
    const type = allParticipantIds.length === 2 ? "direct" : "group";

    if (type === "direct") {
      const existing = await this.findExistingDirectConversation(
        companyId,
        allParticipantIds[0],
        allParticipantIds[1],
      );
      if (existing) {
        return existing;
      }
    }

    const conversation = this.conversationRepo.create({
      companyId,
      type,
      name: type === "group" ? name : null,
      createdById,
    });
    const saved = await this.conversationRepo.save(conversation);

    const participants = allParticipantIds.map((userId) =>
      this.participantRepo.create({
        conversationId: saved.id,
        userId,
      }),
    );
    await this.participantRepo.save(participants);

    return this.conversationRepo.findOneOrFail({
      where: { id: saved.id },
      relations: ["participants", "participants.user"],
    });
  }

  async markRead(conversationId: number, userId: number): Promise<void> {
    await this.participantRepo.update({ conversationId, userId }, { lastReadAt: now().toJSDate() });
  }

  async unreadCounts(companyId: number, userId: number): Promise<Record<string, number>> {
    const participantRows = await this.participantRepo.find({
      where: { userId },
    });

    if (participantRows.length === 0) {
      return {};
    }

    const counts: Record<string, number> = {};

    const countPromises = participantRows.map(async (p) => {
      const qb = this.chatRepo
        .createQueryBuilder("msg")
        .where("msg.conversationId = :cid", { cid: p.conversationId })
        .andWhere("msg.companyId = :companyId", { companyId })
        .andWhere("msg.senderId != :userId", { userId });

      if (p.lastReadAt !== null) {
        qb.andWhere("msg.createdAt > :lastRead", { lastRead: p.lastReadAt });
      }

      const count = await qb.getCount();
      if (count > 0) {
        counts[String(p.conversationId)] = count;
      }
    });

    await Promise.all(countPromises);

    return counts;
  }

  async generalUnreadCount(companyId: number, lastReadMessageId: number | null): Promise<number> {
    const qb = this.chatRepo
      .createQueryBuilder("msg")
      .where("msg.companyId = :companyId", { companyId })
      .andWhere("msg.conversationId IS NULL");

    if (lastReadMessageId !== null) {
      const cursorMsg = await this.chatRepo.findOne({ where: { id: lastReadMessageId } });
      if (cursorMsg) {
        qb.andWhere("msg.createdAt > :cursor", { cursor: cursorMsg.createdAt });
      }
    }

    return qb.getCount();
  }

  private async findExistingDirectConversation(
    companyId: number,
    userIdA: number,
    userIdB: number,
  ): Promise<ChatConversation | null> {
    const result = await this.conversationRepo
      .createQueryBuilder("conv")
      .innerJoin("conv.participants", "pA", "pA.userId = :userIdA", { userIdA })
      .innerJoin("conv.participants", "pB", "pB.userId = :userIdB", { userIdB })
      .where("conv.companyId = :companyId", { companyId })
      .andWhere("conv.type = :type", { type: "direct" })
      .getOne();

    if (!result) {
      return null;
    }

    return this.conversationRepo.findOneOrFail({
      where: { id: result.id },
      relations: ["participants", "participants.user"],
    });
  }
}

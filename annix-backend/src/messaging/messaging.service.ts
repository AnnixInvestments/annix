import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, LessThan, Not, Repository } from "typeorm";
import { now } from "../lib/datetime";
import { User } from "../user/entities/user.entity";
import {
  AttachmentDto,
  ConversationDetailDto,
  ConversationFilterDto,
  ConversationSummaryDto,
  CreateConversationDto,
  MessageDto,
  MessagePaginationDto,
  ParticipantDto,
  SendMessageDto,
} from "./dto";
import {
  Conversation,
  ConversationParticipant,
  ConversationType,
  Message,
  MessageAttachment,
  MessageReadReceipt,
  MessageType,
  ParticipantRole,
  RelatedEntityType,
} from "./entities";
import { MessageNotificationService } from "./message-notification.service";
import { ResponseMetricsService } from "./response-metrics.service";

@Injectable()
export class MessagingService {
  constructor(
    @InjectRepository(Conversation)
    private readonly conversationRepo: Repository<Conversation>,
    @InjectRepository(ConversationParticipant)
    private readonly participantRepo: Repository<ConversationParticipant>,
    @InjectRepository(Message)
    private readonly messageRepo: Repository<Message>,
    @InjectRepository(MessageAttachment)
    private readonly attachmentRepo: Repository<MessageAttachment>,
    @InjectRepository(MessageReadReceipt)
    private readonly receiptRepo: Repository<MessageReadReceipt>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly metricsService: ResponseMetricsService,
    private readonly notificationService: MessageNotificationService,
  ) {}

  async createConversation(
    creatorId: number,
    dto: CreateConversationDto,
  ): Promise<ConversationDetailDto> {
    const allParticipantIds = [...new Set([creatorId, ...dto.participantIds])];

    const users = await this.userRepo.find({
      where: { id: In(allParticipantIds) },
    });

    if (users.length !== allParticipantIds.length) {
      throw new BadRequestException("One or more participant IDs are invalid");
    }

    const conversation = this.conversationRepo.create({
      subject: dto.subject,
      conversationType: dto.conversationType || ConversationType.DIRECT,
      relatedEntityType: dto.relatedEntityType || RelatedEntityType.GENERAL,
      relatedEntityId: dto.relatedEntityId || null,
      createdById: creatorId,
      lastMessageAt: null,
      isArchived: false,
    });

    const savedConversation = await this.conversationRepo.save(conversation);

    const participants = allParticipantIds.map((userId) =>
      this.participantRepo.create({
        conversationId: savedConversation.id,
        userId,
        role: userId === creatorId ? ParticipantRole.OWNER : ParticipantRole.PARTICIPANT,
        isActive: true,
        lastReadAt: null,
      }),
    );

    await this.participantRepo.save(participants);

    if (dto.initialMessage) {
      await this.sendMessage(savedConversation.id, creatorId, {
        content: dto.initialMessage,
      });
    }

    return this.conversationDetail(savedConversation.id, creatorId);
  }

  async sendMessage(
    conversationId: number,
    senderId: number,
    dto: SendMessageDto,
  ): Promise<MessageDto> {
    const participant = await this.participantRepo.findOne({
      where: { conversationId, userId: senderId, isActive: true },
    });

    if (!participant) {
      throw new ForbiddenException("You are not a participant in this conversation");
    }

    const conversation = await this.conversationRepo.findOne({
      where: { id: conversationId },
    });

    if (!conversation) {
      throw new NotFoundException("Conversation not found");
    }

    if (conversation.isArchived) {
      throw new BadRequestException("Cannot send messages to archived conversation");
    }

    const sender = await this.userRepo.findOne({ where: { id: senderId } });
    if (!sender) {
      throw new NotFoundException("Sender not found");
    }

    const message = this.messageRepo.create({
      conversationId,
      senderId,
      content: dto.content,
      messageType: MessageType.TEXT,
      parentMessageId: dto.parentMessageId || null,
      sentAt: now().toJSDate(),
      isDeleted: false,
    });

    const savedMessage = await this.messageRepo.save(message);

    conversation.lastMessageAt = savedMessage.sentAt;
    await this.conversationRepo.save(conversation);

    participant.lastReadAt = savedMessage.sentAt;
    await this.participantRepo.save(participant);

    const selfReceipt = this.receiptRepo.create({
      messageId: savedMessage.id,
      userId: senderId,
      readAt: now().toJSDate(),
    });
    await this.receiptRepo.save(selfReceipt);

    await this.metricsService.recordResponse(savedMessage);

    const otherParticipants = await this.participantRepo.find({
      where: { conversationId, isActive: true, userId: Not(senderId) },
      relations: ["user"],
    });

    await this.notificationService.notifyNewMessage(
      savedMessage,
      conversation,
      sender,
      otherParticipants.map((p) => p.user),
    );

    return this.messageToDto(savedMessage, sender.firstName || "", sender.lastName || "");
  }

  async conversationsForUser(
    userId: number,
    filters: ConversationFilterDto,
  ): Promise<{ conversations: ConversationSummaryDto[]; total: number }> {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const participations = await this.participantRepo.find({
      where: { userId, isActive: true },
      select: ["conversationId"],
    });

    const conversationIds = participations.map((p) => p.conversationId);

    if (conversationIds.length === 0) {
      return { conversations: [], total: 0 };
    }

    const queryBuilder = this.conversationRepo
      .createQueryBuilder("c")
      .where("c.id IN (:...ids)", { ids: conversationIds });

    if (filters.isArchived !== undefined) {
      queryBuilder.andWhere("c.isArchived = :isArchived", {
        isArchived: filters.isArchived,
      });
    }

    if (filters.relatedEntityType) {
      queryBuilder.andWhere("c.relatedEntityType = :relatedEntityType", {
        relatedEntityType: filters.relatedEntityType,
      });
    }

    if (filters.relatedEntityId) {
      queryBuilder.andWhere("c.relatedEntityId = :relatedEntityId", {
        relatedEntityId: filters.relatedEntityId,
      });
    }

    queryBuilder.orderBy("c.lastMessageAt", "DESC", "NULLS LAST").skip(skip).take(limit);

    const [conversations, total] = await queryBuilder.getManyAndCount();

    const summaries = await Promise.all(
      conversations.map((c) => this.conversationToSummary(c, userId)),
    );

    return { conversations: summaries, total };
  }

  async conversationDetail(conversationId: number, userId: number): Promise<ConversationDetailDto> {
    const participant = await this.participantRepo.findOne({
      where: { conversationId, userId, isActive: true },
    });

    if (!participant) {
      throw new ForbiddenException("You are not a participant in this conversation");
    }

    const conversation = await this.conversationRepo.findOne({
      where: { id: conversationId },
      relations: ["participants", "participants.user"],
    });

    if (!conversation) {
      throw new NotFoundException("Conversation not found");
    }

    const messages = await this.messagesForConversation(conversationId, userId, { limit: 50 });

    const summary = await this.conversationToSummary(conversation, userId);

    const participantDtos = conversation.participants
      .filter((p) => p.isActive)
      .map((p) => this.participantToDto(p));

    return {
      ...summary,
      participants: participantDtos,
      messages: messages.messages,
    };
  }

  async messagesForConversation(
    conversationId: number,
    userId: number,
    pagination: MessagePaginationDto,
  ): Promise<{ messages: MessageDto[]; hasMore: boolean }> {
    const participant = await this.participantRepo.findOne({
      where: { conversationId, userId, isActive: true },
    });

    if (!participant) {
      throw new ForbiddenException("You are not a participant in this conversation");
    }

    const limit = pagination.limit || 50;

    const queryBuilder = this.messageRepo
      .createQueryBuilder("m")
      .leftJoinAndSelect("m.sender", "sender")
      .leftJoinAndSelect("m.attachments", "attachments")
      .leftJoinAndSelect("m.readReceipts", "receipts")
      .where("m.conversationId = :conversationId", { conversationId })
      .andWhere("m.isDeleted = false");

    if (pagination.beforeId) {
      queryBuilder.andWhere("m.id < :beforeId", {
        beforeId: pagination.beforeId,
      });
    }

    if (pagination.afterId) {
      queryBuilder.andWhere("m.id > :afterId", { afterId: pagination.afterId });
    }

    queryBuilder.orderBy("m.sentAt", "DESC").take(limit + 1);

    const messages = await queryBuilder.getMany();

    const hasMore = messages.length > limit;
    const resultMessages = hasMore ? messages.slice(0, limit) : messages;

    const messageDtos = resultMessages
      .map((m) =>
        this.messageToDto(
          m,
          m.sender?.firstName || "Unknown",
          m.sender?.lastName || "",
          m.attachments,
          m.readReceipts,
        ),
      )
      .reverse();

    return { messages: messageDtos, hasMore };
  }

  async markAsRead(conversationId: number, userId: number): Promise<void> {
    const participant = await this.participantRepo.findOne({
      where: { conversationId, userId, isActive: true },
    });

    if (!participant) {
      throw new ForbiddenException("You are not a participant in this conversation");
    }

    const unreadMessages = await this.messageRepo.find({
      where: {
        conversationId,
        senderId: Not(userId),
        sentAt: participant.lastReadAt ? LessThan(participant.lastReadAt) : undefined,
      },
    });

    const existingReceipts = await this.receiptRepo.find({
      where: {
        messageId: In(unreadMessages.map((m) => m.id)),
        userId,
      },
    });

    const existingMessageIds = new Set(existingReceipts.map((r) => r.messageId));

    const newReceipts = unreadMessages
      .filter((m) => !existingMessageIds.has(m.id))
      .map((m) =>
        this.receiptRepo.create({
          messageId: m.id,
          userId,
          readAt: now().toJSDate(),
        }),
      );

    if (newReceipts.length > 0) {
      await this.receiptRepo.save(newReceipts);
    }

    participant.lastReadAt = now().toJSDate();
    await this.participantRepo.save(participant);
  }

  async archiveConversation(conversationId: number, userId: number): Promise<void> {
    const participant = await this.participantRepo.findOne({
      where: { conversationId, userId, isActive: true },
    });

    if (!participant) {
      throw new ForbiddenException("You are not a participant in this conversation");
    }

    if (participant.role !== ParticipantRole.OWNER) {
      throw new ForbiddenException("Only the conversation owner can archive it");
    }

    await this.conversationRepo.update(conversationId, { isArchived: true });
  }

  async unarchiveConversation(conversationId: number, userId: number): Promise<void> {
    const participant = await this.participantRepo.findOne({
      where: { conversationId, userId, isActive: true },
    });

    if (!participant) {
      throw new ForbiddenException("You are not a participant in this conversation");
    }

    if (participant.role !== ParticipantRole.OWNER) {
      throw new ForbiddenException("Only the conversation owner can unarchive it");
    }

    await this.conversationRepo.update(conversationId, { isArchived: false });
  }

  async addAttachment(
    messageId: number,
    userId: number,
    fileName: string,
    filePath: string,
    fileSize: number,
    mimeType: string,
  ): Promise<AttachmentDto> {
    const message = await this.messageRepo.findOne({
      where: { id: messageId },
    });

    if (!message) {
      throw new NotFoundException("Message not found");
    }

    if (message.senderId !== userId) {
      throw new ForbiddenException("You can only add attachments to your own messages");
    }

    const attachment = this.attachmentRepo.create({
      messageId,
      fileName,
      filePath,
      fileSize,
      mimeType,
    });

    const saved = await this.attachmentRepo.save(attachment);

    return {
      id: saved.id,
      fileName: saved.fileName,
      fileSize: saved.fileSize,
      mimeType: saved.mimeType,
      downloadUrl: `/api/messaging/attachments/${saved.id}`,
    };
  }

  async attachment(attachmentId: number, userId: number): Promise<MessageAttachment> {
    const attachment = await this.attachmentRepo.findOne({
      where: { id: attachmentId },
      relations: ["message"],
    });

    if (!attachment) {
      throw new NotFoundException("Attachment not found");
    }

    const participant = await this.participantRepo.findOne({
      where: {
        conversationId: attachment.message.conversationId,
        userId,
        isActive: true,
      },
    });

    if (!participant) {
      throw new ForbiddenException("You do not have access to this attachment");
    }

    return attachment;
  }

  async unreadCountForUser(userId: number): Promise<number> {
    const participations = await this.participantRepo.find({
      where: { userId, isActive: true },
    });

    const counts = await Promise.all(
      participations.map(async (p) => {
        const count = await this.messageRepo.count({
          where: {
            conversationId: p.conversationId,
            senderId: Not(userId),
            sentAt: p.lastReadAt ? LessThan(p.lastReadAt) : undefined,
          },
        });
        return count;
      }),
    );

    return counts.reduce((sum, c) => sum + c, 0);
  }

  private async conversationToSummary(
    conversation: Conversation,
    userId: number,
  ): Promise<ConversationSummaryDto> {
    const participants = await this.participantRepo.find({
      where: { conversationId: conversation.id, isActive: true },
      relations: ["user"],
    });

    const userParticipant = participants.find((p) => p.userId === userId);

    const lastMessage = await this.messageRepo.findOne({
      where: { conversationId: conversation.id, isDeleted: false },
      order: { sentAt: "DESC" },
    });

    const unreadCount = userParticipant?.lastReadAt
      ? await this.messageRepo.count({
          where: {
            conversationId: conversation.id,
            senderId: Not(userId),
            isDeleted: false,
          },
        })
      : await this.messageRepo.count({
          where: {
            conversationId: conversation.id,
            senderId: Not(userId),
            isDeleted: false,
          },
        });

    const participantNames = participants
      .filter((p) => p.userId !== userId)
      .map((p) =>
        p.user ? `${p.user.firstName || ""} ${p.user.lastName || ""}`.trim() : "Unknown",
      );

    return {
      id: conversation.id,
      subject: conversation.subject,
      conversationType: conversation.conversationType,
      relatedEntityType: conversation.relatedEntityType,
      relatedEntityId: conversation.relatedEntityId,
      unreadCount,
      lastMessagePreview: lastMessage ? lastMessage.content.substring(0, 100) : null,
      lastMessageAt: conversation.lastMessageAt,
      participantNames,
      isArchived: conversation.isArchived,
      createdAt: conversation.createdAt,
    };
  }

  private participantToDto(participant: ConversationParticipant): ParticipantDto {
    return {
      id: participant.id,
      userId: participant.userId,
      name: participant.user
        ? `${participant.user.firstName || ""} ${participant.user.lastName || ""}`.trim()
        : "Unknown",
      email: participant.user?.email || "",
      role: participant.role,
      isActive: participant.isActive,
      lastReadAt: participant.lastReadAt,
    };
  }

  private messageToDto(
    message: Message,
    senderFirstName: string,
    senderLastName: string,
    attachments?: MessageAttachment[],
    readReceipts?: MessageReadReceipt[],
  ): MessageDto {
    return {
      id: message.id,
      senderId: message.senderId,
      senderName: `${senderFirstName} ${senderLastName}`.trim(),
      content: message.content,
      messageType: message.messageType,
      parentMessageId: message.parentMessageId,
      sentAt: message.sentAt,
      editedAt: message.editedAt,
      isDeleted: message.isDeleted,
      attachments: (attachments || []).map((a) => ({
        id: a.id,
        fileName: a.fileName,
        fileSize: a.fileSize,
        mimeType: a.mimeType,
        downloadUrl: `/api/messaging/attachments/${a.id}`,
      })),
      readByUserIds: (readReceipts || []).map((r) => r.userId),
    };
  }
}

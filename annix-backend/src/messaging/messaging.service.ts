import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { now } from "../lib/datetime";
import { UserRepository } from "../user/user.repository";
import { ConversationRepository } from "./conversation.repository";
import { ConversationParticipantRepository } from "./conversation-participant.repository";
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
import { MessageRepository } from "./message.repository";
import { MessageAttachmentRepository } from "./message-attachment.repository";
import { MessageNotificationService } from "./message-notification.service";
import { MessageReadReceiptRepository } from "./message-read-receipt.repository";
import { ResponseMetricsService } from "./response-metrics.service";

@Injectable()
export class MessagingService {
  constructor(
    private readonly conversationRepo: ConversationRepository,
    private readonly participantRepo: ConversationParticipantRepository,
    private readonly messageRepo: MessageRepository,
    private readonly attachmentRepo: MessageAttachmentRepository,
    private readonly receiptRepo: MessageReadReceiptRepository,
    private readonly userRepo: UserRepository,
    private readonly metricsService: ResponseMetricsService,
    private readonly notificationService: MessageNotificationService,
  ) {}

  async createConversation(
    creatorId: number,
    dto: CreateConversationDto,
  ): Promise<ConversationDetailDto> {
    const allParticipantIds = [...new Set([creatorId, ...dto.participantIds])];

    const users = await this.userRepo.findByIds(allParticipantIds);

    if (users.length !== allParticipantIds.length) {
      throw new BadRequestException("One or more participant IDs are invalid");
    }

    const savedConversation = await this.conversationRepo.create({
      subject: dto.subject,
      conversationType: dto.conversationType || ConversationType.DIRECT,
      relatedEntityType: dto.relatedEntityType || RelatedEntityType.GENERAL,
      relatedEntityId: dto.relatedEntityId || null,
      createdById: creatorId,
      lastMessageAt: null,
      isArchived: false,
    });

    const participants = allParticipantIds.map((userId) =>
      this.participantRepo.create({
        conversationId: savedConversation.id,
        userId,
        role: userId === creatorId ? ParticipantRole.OWNER : ParticipantRole.PARTICIPANT,
        isActive: true,
        lastReadAt: null,
      }),
    );

    await Promise.all(participants);

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
    const participant = await this.participantRepo.findActiveByConversationAndUser(
      conversationId,
      senderId,
    );

    if (!participant) {
      throw new ForbiddenException("You are not a participant in this conversation");
    }

    const conversation = await this.conversationRepo.findById(conversationId);

    if (!conversation) {
      throw new NotFoundException("Conversation not found");
    }

    if (conversation.isArchived) {
      throw new BadRequestException("Cannot send messages to archived conversation");
    }

    const sender = await this.userRepo.findById(senderId);
    if (!sender) {
      throw new NotFoundException("Sender not found");
    }

    const savedMessage = await this.messageRepo.create({
      conversationId,
      senderId,
      content: dto.content,
      messageType: MessageType.TEXT,
      parentMessageId: dto.parentMessageId || null,
      sentAt: now().toJSDate(),
      isDeleted: false,
    });

    conversation.lastMessageAt = savedMessage.sentAt;
    await this.conversationRepo.save(conversation);

    participant.lastReadAt = savedMessage.sentAt;
    await this.participantRepo.save(participant);

    await this.receiptRepo.create({
      messageId: savedMessage.id,
      userId: senderId,
      readAt: now().toJSDate(),
    });

    await this.metricsService.recordResponse(savedMessage);

    const otherParticipants = await this.participantRepo.findActiveByConversationExcludingUser(
      conversationId,
      senderId,
    );

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

    const participations = await this.participantRepo.findActiveByUser(userId);
    const conversationIds = participations.map((p) => p.conversationId);

    if (conversationIds.length === 0) {
      return { conversations: [], total: 0 };
    }

    const { conversations, total } = await this.conversationRepo.findInIds(
      conversationIds,
      filters,
      skip,
      limit,
    );

    const summaries = await Promise.all(
      conversations.map((c) => this.conversationToSummary(c, userId)),
    );

    return { conversations: summaries, total };
  }

  async allConversationsForAdmin(
    filters: ConversationFilterDto,
  ): Promise<{ conversations: ConversationSummaryDto[]; total: number }> {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const { conversations, total } = await this.conversationRepo.findFiltered(filters, skip, limit);

    const summaries = await Promise.all(
      conversations.map((c) => this.conversationToSummaryAdmin(c)),
    );

    return { conversations: summaries, total };
  }

  async conversationDetailForAdmin(conversationId: number): Promise<ConversationDetailDto> {
    const conversation = await this.conversationRepo.findById(conversationId, [
      "participants",
      "participants.user",
    ]);

    if (!conversation) {
      throw new NotFoundException("Conversation not found");
    }

    const messages = await this.messagesForConversationAdmin(conversationId, { limit: 50 });

    const summary = await this.conversationToSummaryAdmin(conversation);

    const participantDtos = conversation.participants
      .filter((p) => p.isActive)
      .map((p) => this.participantToDto(p));

    return {
      ...summary,
      participants: participantDtos,
      messages: messages.messages,
    };
  }

  async messagesForConversationAdmin(
    conversationId: number,
    pagination: MessagePaginationDto,
  ): Promise<{ messages: MessageDto[]; hasMore: boolean }> {
    const conversation = await this.conversationRepo.findById(conversationId);

    if (!conversation) {
      throw new NotFoundException("Conversation not found");
    }

    const { messages, hasMore } = await this.messageRepo.findPageForConversation(
      conversationId,
      pagination,
    );

    const messageDtos = messages
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

  private async conversationToSummaryAdmin(
    conversation: Conversation,
  ): Promise<ConversationSummaryDto> {
    const participants = await this.participantRepo.findActiveByConversation(conversation.id);

    const unreadCount = 0;

    const lastMessage = await this.messageRepo.findOneWhere({
      conversationId: conversation.id,
      isDeleted: false,
    });

    return {
      id: conversation.id,
      subject: conversation.subject,
      conversationType: conversation.conversationType,
      relatedEntityType: conversation.relatedEntityType,
      relatedEntityId: conversation.relatedEntityId,
      unreadCount,
      lastMessagePreview: lastMessage?.content?.substring(0, 100) ?? null,
      lastMessageAt: lastMessage?.sentAt ?? null,
      participantNames: participants.map(
        (p) => `${p.user?.firstName || ""} ${p.user?.lastName || ""}`.trim() || p.user?.email || "",
      ),
      isArchived: conversation.isArchived,
      createdAt: conversation.createdAt,
    };
  }

  async conversationDetail(conversationId: number, userId: number): Promise<ConversationDetailDto> {
    const participant = await this.participantRepo.findActiveByConversationAndUser(
      conversationId,
      userId,
    );

    if (!participant) {
      throw new ForbiddenException("You are not a participant in this conversation");
    }

    const conversation = await this.conversationRepo.findById(conversationId, [
      "participants",
      "participants.user",
    ]);

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
    const participant = await this.participantRepo.findActiveByConversationAndUser(
      conversationId,
      userId,
    );

    if (!participant) {
      throw new ForbiddenException("You are not a participant in this conversation");
    }

    const { messages, hasMore } = await this.messageRepo.findPageForConversation(
      conversationId,
      pagination,
    );

    const messageDtos = messages
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
    const participant = await this.participantRepo.findActiveByConversationAndUser(
      conversationId,
      userId,
    );

    if (!participant) {
      throw new ForbiddenException("You are not a participant in this conversation");
    }

    const unreadMessages = await this.messageRepo.findManyWhere({
      conversationId,
      senderId: userId,
    });

    const existingReceipts = await this.receiptRepo.findByMessageIdsAndUser(
      unreadMessages.map((m) => m.id),
      userId,
    );

    const existingMessageIds = new Set(existingReceipts.map((r) => r.messageId));

    const newReceipts = unreadMessages.filter((m) => !existingMessageIds.has(m.id));

    await Promise.all(
      newReceipts.map((m) =>
        this.receiptRepo.create({
          messageId: m.id,
          userId,
          readAt: now().toJSDate(),
        }),
      ),
    );

    participant.lastReadAt = now().toJSDate();
    await this.participantRepo.save(participant);
  }

  async archiveConversation(conversationId: number, userId: number): Promise<void> {
    const participant = await this.participantRepo.findActiveByConversationAndUser(
      conversationId,
      userId,
    );

    if (!participant) {
      throw new ForbiddenException("You are not a participant in this conversation");
    }

    if (participant.role !== ParticipantRole.OWNER) {
      throw new ForbiddenException("Only the conversation owner can archive it");
    }

    await this.conversationRepo.updateArchived(conversationId, true);
  }

  async unarchiveConversation(conversationId: number, userId: number): Promise<void> {
    const participant = await this.participantRepo.findActiveByConversationAndUser(
      conversationId,
      userId,
    );

    if (!participant) {
      throw new ForbiddenException("You are not a participant in this conversation");
    }

    if (participant.role !== ParticipantRole.OWNER) {
      throw new ForbiddenException("Only the conversation owner can unarchive it");
    }

    await this.conversationRepo.updateArchived(conversationId, false);
  }

  async addAttachment(
    messageId: number,
    userId: number,
    fileName: string,
    filePath: string,
    fileSize: number,
    mimeType: string,
  ): Promise<AttachmentDto> {
    const message = await this.messageRepo.findById(messageId);

    if (!message) {
      throw new NotFoundException("Message not found");
    }

    if (message.senderId !== userId) {
      throw new ForbiddenException("You can only add attachments to your own messages");
    }

    const saved = await this.attachmentRepo.create({
      messageId,
      fileName,
      filePath,
      fileSize,
      mimeType,
    });

    return {
      id: saved.id,
      fileName: saved.fileName,
      fileSize: saved.fileSize,
      mimeType: saved.mimeType,
      downloadUrl: `/api/messaging/attachments/${saved.id}`,
    };
  }

  async attachment(attachmentId: number, userId: number): Promise<MessageAttachment> {
    const attachment = await this.attachmentRepo.findById(attachmentId, ["message"]);

    if (!attachment) {
      throw new NotFoundException("Attachment not found");
    }

    const participant = await this.participantRepo.findActiveByConversationAndUser(
      attachment.message.conversationId,
      userId,
    );

    if (!participant) {
      throw new ForbiddenException("You do not have access to this attachment");
    }

    return attachment;
  }

  async unreadCountForUser(userId: number): Promise<number> {
    const participations = await this.participantRepo.findActiveByUser(userId);

    const counts = await Promise.all(
      participations.map(async (p) => {
        return this.messageRepo.countUnreadForParticipant(p.conversationId, userId, p.lastReadAt);
      }),
    );

    return counts.reduce((sum, c) => sum + c, 0);
  }

  private async conversationToSummary(
    conversation: Conversation,
    userId: number,
  ): Promise<ConversationSummaryDto> {
    const participants = await this.participantRepo.findActiveByConversation(conversation.id);

    const userParticipant = participants.find((p) => p.userId === userId);

    const lastMessage = await this.messageRepo.findOneWhere({
      conversationId: conversation.id,
      isDeleted: false,
    });

    const unreadCount = await this.messageRepo.countUnreadForParticipant(
      conversation.id,
      userId,
      userParticipant?.lastReadAt ?? null,
    );

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

  async deleteConversationsByAdmin(conversationIds: number[]): Promise<{ deleted: number }> {
    if (conversationIds.length === 0) {
      return { deleted: 0 };
    }

    await this.receiptRepo.deleteByConversationIds(conversationIds);
    await this.attachmentRepo.deleteByConversationIds(conversationIds);
    await this.messageRepo.deleteByConversationIds(conversationIds);
    await this.participantRepo.deleteByConversationIds(conversationIds);

    let deleted = 0;
    for (const id of conversationIds) {
      const conversation = await this.conversationRepo.findById(id);
      if (conversation) {
        await this.conversationRepo.remove(conversation);
        deleted++;
      }
    }

    return { deleted };
  }
}

import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { CustomerProfileRepository } from "../customer/customer-profile.repository";
import { fromISO, now } from "../lib/datetime";
import { SupplierProfileRepository } from "../supplier/supplier-profile.repository";
import { UserRepository } from "../user/user.repository";
import { BroadcastRepository } from "./broadcast.repository";
import { BroadcastRecipientRepository } from "./broadcast-recipient.repository";
import {
  BroadcastDetailDto,
  BroadcastFilterDto,
  BroadcastSummaryDto,
  CreateBroadcastDto,
} from "./dto";
import { Broadcast, BroadcastPriority, BroadcastTarget } from "./entities";
import { MessageNotificationService } from "./message-notification.service";

@Injectable()
export class BroadcastService {
  constructor(
    private readonly broadcastRepo: BroadcastRepository,
    private readonly recipientRepo: BroadcastRecipientRepository,
    private readonly userRepo: UserRepository,
    private readonly customerProfileRepo: CustomerProfileRepository,
    private readonly supplierProfileRepo: SupplierProfileRepository,
    private readonly notificationService: MessageNotificationService,
  ) {}

  async createBroadcast(senderId: number, dto: CreateBroadcastDto): Promise<BroadcastDetailDto> {
    const sender = await this.userRepo.findById(senderId);

    if (!sender) {
      throw new NotFoundException("Sender not found");
    }

    const targetUserIds = await this.resolveTargetUsers(dto);

    if (targetUserIds.length === 0) {
      throw new BadRequestException("No recipients found for this broadcast");
    }

    const savedBroadcast = await this.broadcastRepo.create({
      title: dto.title,
      content: dto.content,
      targetAudience: dto.targetAudience || BroadcastTarget.ALL,
      sentById: senderId,
      priority: dto.priority || BroadcastPriority.NORMAL,
      expiresAt: dto.expiresAt ? fromISO(dto.expiresAt).toJSDate() : null,
    });

    await Promise.all(
      targetUserIds.map((userId) =>
        this.recipientRepo.create({
          broadcastId: savedBroadcast.id,
          userId,
          readAt: null,
          emailSentAt: null,
        }),
      ),
    );

    if (dto.sendEmail) {
      await this.sendBroadcastEmails(savedBroadcast, targetUserIds);
    }

    return this.broadcastDetail(savedBroadcast.id, senderId);
  }

  async broadcastsForUser(
    userId: number,
    filters: BroadcastFilterDto,
  ): Promise<{ broadcasts: BroadcastSummaryDto[]; total: number }> {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const recipientRecords = await this.recipientRepo.findByUser(userId);

    const broadcastIdToReadAt = new Map(recipientRecords.map((r) => [r.broadcastId, r.readAt]));

    let broadcastIds = recipientRecords.map((r) => r.broadcastId);

    if (broadcastIds.length === 0) {
      return { broadcasts: [], total: 0 };
    }

    if (filters.unreadOnly) {
      const unreadIds = recipientRecords.filter((r) => r.readAt === null).map((r) => r.broadcastId);

      if (unreadIds.length === 0) {
        return { broadcasts: [], total: 0 };
      }

      broadcastIds = unreadIds;
    }

    const { broadcasts, total } = await this.broadcastRepo.findPageForIds(
      broadcastIds,
      filters,
      skip,
      limit,
    );

    const summaries = broadcasts.map((b) =>
      this.broadcastToSummary(b, broadcastIdToReadAt.get(b.id) ?? null),
    );

    return { broadcasts: summaries, total };
  }

  async broadcastsForAdmin(
    filters: BroadcastFilterDto,
  ): Promise<{ broadcasts: BroadcastDetailDto[]; total: number }> {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const { broadcasts, total } = await this.broadcastRepo.findBroadcastPage(filters, skip, limit);

    const details = await Promise.all(broadcasts.map((b) => this.broadcastDetailFromEntity(b)));

    return { broadcasts: details, total };
  }

  async broadcastDetail(broadcastId: number, userId: number): Promise<BroadcastDetailDto> {
    const broadcast = await this.broadcastRepo.findById(broadcastId, ["sentBy"]);

    if (!broadcast) {
      throw new NotFoundException("Broadcast not found");
    }

    const recipient = await this.recipientRepo.findByBroadcastAndUser(broadcastId, userId);

    if (!recipient && broadcast.sentById !== userId) {
      throw new NotFoundException("Broadcast not found");
    }

    return this.broadcastDetailFromEntity(broadcast, recipient?.readAt ?? null);
  }

  async markBroadcastRead(broadcastId: number, userId: number): Promise<void> {
    const recipient = await this.recipientRepo.findByBroadcastAndUser(broadcastId, userId);

    if (!recipient) {
      throw new NotFoundException("Broadcast recipient not found");
    }

    if (recipient.readAt === null) {
      recipient.readAt = now().toJSDate();
      await this.recipientRepo.save(recipient);
    }
  }

  async unreadBroadcastCount(userId: number): Promise<number> {
    return this.recipientRepo.countUnreadForUser(userId);
  }

  private async resolveTargetUsers(dto: CreateBroadcastDto): Promise<number[]> {
    const target = dto.targetAudience || BroadcastTarget.ALL;

    if (target === BroadcastTarget.SPECIFIC) {
      return dto.specificUserIds || [];
    }

    if (target === BroadcastTarget.CUSTOMERS) {
      return this.customerProfileRepo.allUserIds();
    }

    if (target === BroadcastTarget.SUPPLIERS) {
      return this.supplierProfileRepo.allUserIds();
    }

    const customerUserIds = await this.customerProfileRepo.allUserIds();
    const supplierUserIds = await this.supplierProfileRepo.allUserIds();

    const allUserIds = [...customerUserIds, ...supplierUserIds];

    return [...new Set(allUserIds)];
  }

  private async sendBroadcastEmails(broadcast: Broadcast, userIds: number[]): Promise<void> {
    const users = await this.userRepo.findByIdsWithRoles(userIds);

    await this.notificationService.notifyBroadcast(broadcast, users);

    await this.recipientRepo.updateEmailSentAt(broadcast.id, userIds, now().toJSDate());
  }

  private broadcastToSummary(broadcast: Broadcast, readAt: Date | null): BroadcastSummaryDto {
    return {
      id: broadcast.id,
      title: broadcast.title,
      contentPreview: broadcast.content.substring(0, 200),
      targetAudience: broadcast.targetAudience,
      priority: broadcast.priority,
      expiresAt: broadcast.expiresAt,
      isRead: readAt !== null,
      createdAt: broadcast.createdAt,
      sentByName: broadcast.sentBy
        ? `${broadcast.sentBy.firstName || ""} ${broadcast.sentBy.lastName || ""}`.trim()
        : "System",
    };
  }

  private async broadcastDetailFromEntity(
    broadcast: Broadcast,
    readAt?: Date | null,
  ): Promise<BroadcastDetailDto> {
    const totalRecipients = await this.recipientRepo.count({ broadcastId: broadcast.id });
    const readCount = await this.recipientRepo.countReadForBroadcast(broadcast.id);
    const emailSentCount = await this.recipientRepo.countEmailSentForBroadcast(broadcast.id);

    return {
      id: broadcast.id,
      title: broadcast.title,
      contentPreview: broadcast.content.substring(0, 200),
      content: broadcast.content,
      targetAudience: broadcast.targetAudience,
      priority: broadcast.priority,
      expiresAt: broadcast.expiresAt,
      isRead: readAt !== null && readAt !== undefined,
      createdAt: broadcast.createdAt,
      sentByName: broadcast.sentBy
        ? `${broadcast.sentBy.firstName || ""} ${broadcast.sentBy.lastName || ""}`.trim()
        : "System",
      totalRecipients,
      readCount,
      emailSentCount,
    };
  }
}

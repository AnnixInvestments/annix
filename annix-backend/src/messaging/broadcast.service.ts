import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, MoreThan, IsNull, Or, Not } from 'typeorm';
import { now, fromISO, isExpired } from '../lib/datetime';
import {
  Broadcast,
  BroadcastRecipient,
  BroadcastTarget,
  BroadcastPriority,
} from './entities';
import { User } from '../user/entities/user.entity';
import { CustomerProfile } from '../customer/entities';
import { SupplierProfile } from '../supplier/entities/supplier-profile.entity';
import {
  CreateBroadcastDto,
  BroadcastFilterDto,
  BroadcastSummaryDto,
  BroadcastDetailDto,
} from './dto';
import { MessageNotificationService } from './message-notification.service';

@Injectable()
export class BroadcastService {
  constructor(
    @InjectRepository(Broadcast)
    private readonly broadcastRepo: Repository<Broadcast>,
    @InjectRepository(BroadcastRecipient)
    private readonly recipientRepo: Repository<BroadcastRecipient>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(CustomerProfile)
    private readonly customerProfileRepo: Repository<CustomerProfile>,
    @InjectRepository(SupplierProfile)
    private readonly supplierProfileRepo: Repository<SupplierProfile>,
    private readonly notificationService: MessageNotificationService,
  ) {}

  async createBroadcast(
    senderId: number,
    dto: CreateBroadcastDto,
  ): Promise<BroadcastDetailDto> {
    const sender = await this.userRepo.findOne({ where: { id: senderId } });

    if (!sender) {
      throw new NotFoundException('Sender not found');
    }

    const targetUserIds = await this.resolveTargetUsers(dto);

    if (targetUserIds.length === 0) {
      throw new BadRequestException('No recipients found for this broadcast');
    }

    const broadcast = this.broadcastRepo.create({
      title: dto.title,
      content: dto.content,
      targetAudience: dto.targetAudience || BroadcastTarget.ALL,
      sentById: senderId,
      priority: dto.priority || BroadcastPriority.NORMAL,
      expiresAt: dto.expiresAt ? fromISO(dto.expiresAt).toJSDate() : null,
    });

    const savedBroadcast = await this.broadcastRepo.save(broadcast);

    const recipients = targetUserIds.map((userId) =>
      this.recipientRepo.create({
        broadcastId: savedBroadcast.id,
        userId,
        readAt: null,
        emailSentAt: null,
      }),
    );

    await this.recipientRepo.save(recipients);

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

    const recipientRecords = await this.recipientRepo.find({
      where: { userId },
      select: ['broadcastId', 'readAt'],
    });

    const broadcastIdToReadAt = new Map(
      recipientRecords.map((r) => [r.broadcastId, r.readAt]),
    );

    const broadcastIds = recipientRecords.map((r) => r.broadcastId);

    if (broadcastIds.length === 0) {
      return { broadcasts: [], total: 0 };
    }

    const queryBuilder = this.broadcastRepo
      .createQueryBuilder('b')
      .leftJoinAndSelect('b.sentBy', 'sentBy')
      .where('b.id IN (:...ids)', { ids: broadcastIds });

    if (!filters.includeExpired) {
      queryBuilder.andWhere(
        '(b.expiresAt IS NULL OR b.expiresAt > :now)',
        { now: now().toJSDate() },
      );
    }

    if (filters.priority) {
      queryBuilder.andWhere('b.priority = :priority', {
        priority: filters.priority,
      });
    }

    if (filters.unreadOnly) {
      const unreadIds = recipientRecords
        .filter((r) => r.readAt === null)
        .map((r) => r.broadcastId);

      if (unreadIds.length === 0) {
        return { broadcasts: [], total: 0 };
      }

      queryBuilder.andWhere('b.id IN (:...unreadIds)', { unreadIds });
    }

    queryBuilder
      .orderBy('b.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    const [broadcasts, total] = await queryBuilder.getManyAndCount();

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

    const queryBuilder = this.broadcastRepo
      .createQueryBuilder('b')
      .leftJoinAndSelect('b.sentBy', 'sentBy');

    if (!filters.includeExpired) {
      queryBuilder.andWhere(
        '(b.expiresAt IS NULL OR b.expiresAt > :now)',
        { now: now().toJSDate() },
      );
    }

    if (filters.priority) {
      queryBuilder.andWhere('b.priority = :priority', {
        priority: filters.priority,
      });
    }

    queryBuilder
      .orderBy('b.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    const [broadcasts, total] = await queryBuilder.getManyAndCount();

    const details = await Promise.all(
      broadcasts.map((b) => this.broadcastDetailFromEntity(b)),
    );

    return { broadcasts: details, total };
  }

  async broadcastDetail(
    broadcastId: number,
    userId: number,
  ): Promise<BroadcastDetailDto> {
    const broadcast = await this.broadcastRepo.findOne({
      where: { id: broadcastId },
      relations: ['sentBy'],
    });

    if (!broadcast) {
      throw new NotFoundException('Broadcast not found');
    }

    const recipient = await this.recipientRepo.findOne({
      where: { broadcastId, userId },
    });

    if (!recipient && broadcast.sentById !== userId) {
      throw new NotFoundException('Broadcast not found');
    }

    return this.broadcastDetailFromEntity(
      broadcast,
      recipient?.readAt ?? null,
    );
  }

  async markBroadcastRead(broadcastId: number, userId: number): Promise<void> {
    const recipient = await this.recipientRepo.findOne({
      where: { broadcastId, userId },
    });

    if (!recipient) {
      throw new NotFoundException('Broadcast recipient not found');
    }

    if (recipient.readAt === null) {
      recipient.readAt = now().toJSDate();
      await this.recipientRepo.save(recipient);
    }
  }

  async unreadBroadcastCount(userId: number): Promise<number> {
    return this.recipientRepo.count({
      where: {
        userId,
        readAt: IsNull(),
      },
    });
  }

  private async resolveTargetUsers(dto: CreateBroadcastDto): Promise<number[]> {
    const target = dto.targetAudience || BroadcastTarget.ALL;

    if (target === BroadcastTarget.SPECIFIC) {
      return dto.specificUserIds || [];
    }

    if (target === BroadcastTarget.CUSTOMERS) {
      const profiles = await this.customerProfileRepo.find({
        select: ['userId'],
      });
      return profiles.map((p) => p.userId);
    }

    if (target === BroadcastTarget.SUPPLIERS) {
      const profiles = await this.supplierProfileRepo.find({
        select: ['userId'],
      });
      return profiles.map((p) => p.userId);
    }

    const customerProfiles = await this.customerProfileRepo.find({
      select: ['userId'],
    });
    const supplierProfiles = await this.supplierProfileRepo.find({
      select: ['userId'],
    });

    const allUserIds = [
      ...customerProfiles.map((p) => p.userId),
      ...supplierProfiles.map((p) => p.userId),
    ];

    return [...new Set(allUserIds)];
  }

  private async sendBroadcastEmails(
    broadcast: Broadcast,
    userIds: number[],
  ): Promise<void> {
    const users = await this.userRepo.find({
      where: { id: In(userIds) },
    });

    await this.notificationService.notifyBroadcast(broadcast, users);

    await this.recipientRepo.update(
      { broadcastId: broadcast.id, userId: In(userIds) },
      { emailSentAt: now().toJSDate() },
    );
  }

  private broadcastToSummary(
    broadcast: Broadcast,
    readAt: Date | null,
  ): BroadcastSummaryDto {
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
        ? `${broadcast.sentBy.firstName || ''} ${broadcast.sentBy.lastName || ''}`.trim()
        : 'System',
    };
  }

  private async broadcastDetailFromEntity(
    broadcast: Broadcast,
    readAt?: Date | null,
  ): Promise<BroadcastDetailDto> {
    const totalRecipients = await this.recipientRepo.count({
      where: { broadcastId: broadcast.id },
    });

    const readCount = await this.recipientRepo.count({
      where: {
        broadcastId: broadcast.id,
        readAt: Not(IsNull()),
      },
    });

    const emailSentCount = await this.recipientRepo.count({
      where: {
        broadcastId: broadcast.id,
        emailSentAt: Not(IsNull()),
      },
    });

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
        ? `${broadcast.sentBy.firstName || ''} ${broadcast.sentBy.lastName || ''}`.trim()
        : 'System',
      totalRecipients,
      readCount,
      emailSentCount,
    };
  }
}

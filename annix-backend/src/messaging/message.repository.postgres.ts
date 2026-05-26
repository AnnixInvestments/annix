import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, LessThan, Not, Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../lib/persistence/typeorm-crud-repository";
import { Message } from "./entities/message.entity";
import { MessagePage, MessagePagination, MessageRepository } from "./message.repository";

@Injectable()
export class PostgresMessageRepository
  extends TypeOrmCrudRepository<Message>
  implements MessageRepository
{
  constructor(@InjectRepository(Message) repository: Repository<Message>) {
    super(repository);
  }

  async findPageForConversation(
    conversationId: number,
    pagination: MessagePagination,
  ): Promise<MessagePage> {
    const limit = pagination.limit || 50;

    const queryBuilder = this.repository
      .createQueryBuilder("m")
      .leftJoinAndSelect("m.sender", "sender")
      .leftJoinAndSelect("m.attachments", "attachments")
      .leftJoinAndSelect("m.readReceipts", "receipts")
      .where("m.conversationId = :conversationId", { conversationId })
      .andWhere("m.isDeleted = false");

    if (pagination.beforeId) {
      queryBuilder.andWhere("m.id < :beforeId", { beforeId: pagination.beforeId });
    }

    if (pagination.afterId) {
      queryBuilder.andWhere("m.id > :afterId", { afterId: pagination.afterId });
    }

    queryBuilder.orderBy("m.sentAt", "DESC").take(limit + 1);

    const messages = await queryBuilder.getMany();

    const hasMore = messages.length > limit;
    return { messages: hasMore ? messages.slice(0, limit) : messages, hasMore };
  }

  async findPreviousFromOtherSender(
    conversationId: number,
    senderId: number,
  ): Promise<Message | null> {
    const messages = await this.repository.find({
      where: { conversationId, senderId: Not(senderId) },
      order: { sentAt: "DESC" },
      take: 1,
    });
    return messages[0] ?? null;
  }

  async countUnreadForParticipant(
    conversationId: number,
    userId: number,
    afterDate: Date | null,
  ): Promise<number> {
    return this.repository.count({
      where: {
        conversationId,
        senderId: Not(userId),
        isDeleted: false,
        ...(afterDate ? { sentAt: LessThan(afterDate) } : {}),
      },
    });
  }

  async deleteByConversationIds(conversationIds: number[]): Promise<void> {
    await this.repository.delete({ conversationId: In(conversationIds) });
  }
}

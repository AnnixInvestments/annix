import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { ChatMessage } from "../entities/chat-message.entity";
import { ChatMessageRepository } from "./chat-message.repository";

@Injectable()
export class PostgresChatMessageRepository
  extends TypeOrmCrudRepository<ChatMessage>
  implements ChatMessageRepository
{
  constructor(@InjectRepository(ChatMessage) repository: Repository<ChatMessage>) {
    super(repository);
  }

  async findMessages(
    companyId: number,
    afterId: number | null,
    conversationId: number | null,
    limit: number,
  ): Promise<ChatMessage[]> {
    const qb = this.repository
      .createQueryBuilder("msg")
      .where("msg.companyId = :companyId", { companyId })
      .orderBy("msg.createdAt", "ASC");

    if (conversationId !== null) {
      qb.andWhere("msg.conversationId = :conversationId", { conversationId });
    } else {
      qb.andWhere("msg.conversationId IS NULL");
    }

    if (afterId !== null) {
      const cursorMsg = await this.repository.findOne({ where: { id: afterId } });
      if (cursorMsg) {
        qb.andWhere("msg.createdAt > :cursor", { cursor: cursorMsg.createdAt });
      }
    }

    return qb.take(limit).getMany();
  }

  countUnreadForConversation(
    companyId: number,
    conversationId: number,
    userId: number,
    lastReadAt: Date | null,
  ): Promise<number> {
    const qb = this.repository
      .createQueryBuilder("msg")
      .where("msg.conversationId = :cid", { cid: conversationId })
      .andWhere("msg.companyId = :companyId", { companyId })
      .andWhere("msg.senderId != :userId", { userId });

    if (lastReadAt !== null) {
      qb.andWhere("msg.createdAt > :lastRead", { lastRead: lastReadAt });
    }

    return qb.getCount();
  }

  async countGeneralUnread(companyId: number, lastReadMessageId: number | null): Promise<number> {
    const qb = this.repository
      .createQueryBuilder("msg")
      .where("msg.companyId = :companyId", { companyId })
      .andWhere("msg.conversationId IS NULL");

    if (lastReadMessageId !== null) {
      const cursorMsg = await this.repository.findOne({ where: { id: lastReadMessageId } });
      if (cursorMsg) {
        qb.andWhere("msg.createdAt > :cursor", { cursor: cursorMsg.createdAt });
      }
    }

    return qb.getCount();
  }
}

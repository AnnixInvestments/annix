import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../lib/persistence/typeorm-crud-repository";
import { MessageReadReceipt } from "./entities/message-read-receipt.entity";
import { MessageReadReceiptRepository } from "./message-read-receipt.repository";

@Injectable()
export class PostgresMessageReadReceiptRepository
  extends TypeOrmCrudRepository<MessageReadReceipt>
  implements MessageReadReceiptRepository
{
  constructor(@InjectRepository(MessageReadReceipt) repository: Repository<MessageReadReceipt>) {
    super(repository);
  }

  findByMessageIdsAndUser(messageIds: number[], userId: number): Promise<MessageReadReceipt[]> {
    return this.repository.find({
      where: { messageId: In(messageIds), userId },
    });
  }

  async deleteByConversationIds(conversationIds: number[]): Promise<void> {
    await this.repository.delete({
      message: { conversationId: In(conversationIds) },
    });
  }
}

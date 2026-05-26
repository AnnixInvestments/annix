import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../lib/persistence/typeorm-crud-repository";
import { MessageAttachment } from "./entities/message-attachment.entity";
import { MessageAttachmentRepository } from "./message-attachment.repository";

@Injectable()
export class PostgresMessageAttachmentRepository
  extends TypeOrmCrudRepository<MessageAttachment>
  implements MessageAttachmentRepository
{
  constructor(@InjectRepository(MessageAttachment) repository: Repository<MessageAttachment>) {
    super(repository);
  }

  async deleteByConversationIds(conversationIds: number[]): Promise<void> {
    await this.repository.delete({
      message: { conversationId: In(conversationIds) },
    });
  }
}

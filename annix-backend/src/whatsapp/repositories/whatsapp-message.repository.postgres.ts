import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { WhatsAppMessage } from "../entities/whatsapp-message.entity";
import { WhatsAppMessageRepository } from "./whatsapp-message.repository";

@Injectable()
export class PostgresWhatsAppMessageRepository
  extends TypeOrmCrudRepository<WhatsAppMessage>
  implements WhatsAppMessageRepository
{
  constructor(@InjectRepository(WhatsAppMessage) repository: Repository<WhatsAppMessage>) {
    super(repository);
  }

  async findByConversationOrdered(
    conversationId: string,
    limit: number,
  ): Promise<WhatsAppMessage[]> {
    const rows = await this.repository.find({
      where: { conversationId },
      order: { sentAt: "DESC" },
      take: limit,
    });
    return rows.reverse();
  }

  findByWaMessageId(waMessageId: string): Promise<WhatsAppMessage | null> {
    return this.repository.findOne({ where: { waMessageId } });
  }
}

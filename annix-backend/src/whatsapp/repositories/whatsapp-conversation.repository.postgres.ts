import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { WhatsAppConversation } from "../entities/whatsapp-conversation.entity";
import { WhatsAppConversationRepository } from "./whatsapp-conversation.repository";

@Injectable()
export class PostgresWhatsAppConversationRepository
  extends TypeOrmCrudRepository<WhatsAppConversation>
  implements WhatsAppConversationRepository
{
  constructor(
    @InjectRepository(WhatsAppConversation) repository: Repository<WhatsAppConversation>,
  ) {
    super(repository);
  }

  findByWaId(waId: string): Promise<WhatsAppConversation | null> {
    return this.repository.findOne({ where: { waId } });
  }

  listByRecency(page: number, pageSize: number): Promise<WhatsAppConversation[]> {
    return this.repository.find({
      order: { lastMessageAt: "DESC" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
  }
}

import { CrudRepository } from "../../lib/persistence/crud-repository";
import { WhatsAppConversation } from "../entities/whatsapp-conversation.entity";

export abstract class WhatsAppConversationRepository extends CrudRepository<WhatsAppConversation> {
  abstract findByWaId(waId: string): Promise<WhatsAppConversation | null>;
  abstract listByRecency(page: number, pageSize: number): Promise<WhatsAppConversation[]>;
}

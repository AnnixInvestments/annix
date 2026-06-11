import { CrudRepository } from "../../lib/persistence/crud-repository";
import { WhatsAppMessage } from "../entities/whatsapp-message.entity";

export abstract class WhatsAppMessageRepository extends CrudRepository<WhatsAppMessage> {
  abstract findByConversationOrdered(
    conversationId: string,
    limit: number,
  ): Promise<WhatsAppMessage[]>;
  abstract findByWaMessageId(waMessageId: string): Promise<WhatsAppMessage | null>;
}

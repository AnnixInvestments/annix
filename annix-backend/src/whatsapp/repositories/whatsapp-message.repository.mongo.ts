import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { WhatsAppMessage } from "../entities/whatsapp-message.entity";
import { WhatsAppMessageRepository } from "./whatsapp-message.repository";

@Injectable()
export class MongoWhatsAppMessageRepository
  extends MongoCrudRepository<WhatsAppMessage>
  implements WhatsAppMessageRepository
{
  constructor(@InjectModel("WhatsAppMessage") model: Model<WhatsAppMessage>) {
    super(model);
  }

  async findByConversationOrdered(
    conversationId: string,
    limit: number,
  ): Promise<WhatsAppMessage[]> {
    const docs = await this.documents
      .find({ conversationId })
      .sort({ sentAt: -1 })
      .limit(limit)
      .lean()
      .exec();
    return this.toDomainList(docs.reverse());
  }

  async findByWaMessageId(waMessageId: string): Promise<WhatsAppMessage | null> {
    const doc = await this.documents.findOne({ waMessageId }).lean().exec();
    return doc ? this.toDomain(doc) : null;
  }
}

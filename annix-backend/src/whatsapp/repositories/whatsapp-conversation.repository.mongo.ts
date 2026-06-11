import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { WhatsAppConversation } from "../entities/whatsapp-conversation.entity";
import { WhatsAppConversationRepository } from "./whatsapp-conversation.repository";

@Injectable()
export class MongoWhatsAppConversationRepository
  extends MongoCrudRepository<WhatsAppConversation>
  implements WhatsAppConversationRepository
{
  constructor(@InjectModel("WhatsAppConversation") model: Model<WhatsAppConversation>) {
    super(model);
  }

  async findByWaId(waId: string): Promise<WhatsAppConversation | null> {
    const doc = await this.documents.findOne({ waId }).lean().exec();
    return doc ? this.toDomain(doc) : null;
  }

  async listByRecency(page: number, pageSize: number): Promise<WhatsAppConversation[]> {
    const docs = await this.documents
      .find()
      .sort({ lastMessageAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .lean()
      .exec();
    return this.toDomainList(docs);
  }
}

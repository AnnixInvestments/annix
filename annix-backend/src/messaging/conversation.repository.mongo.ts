import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../lib/persistence/mongo-crud-repository";
import { ConversationPage, ConversationRepository } from "./conversation.repository";
import { ConversationFilterDto } from "./dto";
import { Conversation } from "./entities/conversation.entity";

@Injectable()
export class MongoConversationRepository
  extends MongoCrudRepository<Conversation>
  implements ConversationRepository
{
  constructor(@InjectModel("Conversation") model: Model<Conversation>) {
    super(model);
  }

  async findInIds(
    ids: number[],
    filters: ConversationFilterDto,
    skip: number,
    limit: number,
  ): Promise<ConversationPage> {
    const query: Record<string, unknown> = { _id: { $in: ids } };
    this.applyFilters(query, filters);

    const [rawDocs, total] = await Promise.all([
      this.documents.find(query).sort({ lastMessageAt: -1 }).skip(skip).limit(limit).lean().exec(),
      this.documents.countDocuments(query).exec(),
    ]);

    return { conversations: this.toDomainList(rawDocs), total };
  }

  async findFiltered(
    filters: ConversationFilterDto,
    skip: number,
    limit: number,
  ): Promise<ConversationPage> {
    const query: Record<string, unknown> = {};
    this.applyFilters(query, filters);

    const [rawDocs, total] = await Promise.all([
      this.documents.find(query).sort({ lastMessageAt: -1 }).skip(skip).limit(limit).lean().exec(),
      this.documents.countDocuments(query).exec(),
    ]);

    return { conversations: this.toDomainList(rawDocs), total };
  }

  async updateArchived(id: number, isArchived: boolean): Promise<void> {
    await this.documents.findByIdAndUpdate(id, { isArchived }).exec();
  }

  private applyFilters(query: Record<string, unknown>, filters: ConversationFilterDto): void {
    if (filters.isArchived !== undefined) {
      query["isArchived"] = filters.isArchived;
    }
    if (filters.relatedEntityType) {
      query["relatedEntityType"] = filters.relatedEntityType;
    }
    if (filters.relatedEntityId) {
      query["relatedEntityId"] = filters.relatedEntityId;
    }
  }
}

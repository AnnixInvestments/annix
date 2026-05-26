import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { fromISO } from "../lib/datetime";
import { MongoCrudRepository } from "../lib/persistence/mongo-crud-repository";
import { ConversationResponseMetricRepository } from "./conversation-response-metric.repository";
import { MetricsFilterDto } from "./dto";
import { ConversationResponseMetric } from "./entities/conversation-response-metric.entity";

@Injectable()
export class MongoConversationResponseMetricRepository
  extends MongoCrudRepository<ConversationResponseMetric>
  implements ConversationResponseMetricRepository
{
  constructor(@InjectModel("ConversationResponseMetric") model: Model<ConversationResponseMetric>) {
    super(model);
  }

  async findByResponder(
    userId: number,
    filters?: MetricsFilterDto,
  ): Promise<ConversationResponseMetric[]> {
    const query: Record<string, unknown> = { responderId: userId };
    this.applyDateFilters(query, filters);
    const documents = await this.documents.find(query).lean().exec();
    return this.toDomainList(documents);
  }

  async findFiltered(filters?: MetricsFilterDto): Promise<ConversationResponseMetric[]> {
    const query: Record<string, unknown> = {};
    this.applyDateFilters(query, filters);
    if (filters?.userId) {
      query["responderId"] = filters.userId;
    }
    const documents = await this.documents.find(query).lean().exec();
    return this.toDomainList(documents);
  }

  async existsByMessageAndResponder(messageId: number, responderId: number): Promise<boolean> {
    const count = await this.documents.countDocuments({ messageId, responderId }).exec();
    return count > 0;
  }

  private applyDateFilters(query: Record<string, unknown>, filters?: MetricsFilterDto): void {
    if (filters?.startDate || filters?.endDate) {
      const createdAtFilter: Record<string, unknown> = {};
      if (filters.startDate) {
        createdAtFilter["$gte"] = fromISO(filters.startDate).toJSDate();
      }
      if (filters.endDate) {
        createdAtFilter["$lte"] = fromISO(filters.endDate).toJSDate();
      }
      query["createdAt"] = createdAtFilter;
    }
  }
}

import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../lib/persistence/mongo-crud-repository";
import { InboundEmail, InboundEmailStatus } from "./entities/inbound-email.entity";
import {
  InboundEmailFilters,
  InboundEmailPage,
  InboundEmailRepository,
  InboundEmailStatusCounts,
} from "./inbound-email.repository";

@Injectable()
export class MongoInboundEmailRepository
  extends MongoCrudRepository<InboundEmail>
  implements InboundEmailRepository
{
  constructor(@InjectModel("InboundEmail") model: Model<InboundEmail>) {
    super(model);
  }

  async existsByMessageId(messageId: string): Promise<boolean> {
    const count = await this.documents.countDocuments({ messageId }).exec();
    return count > 0;
  }

  async updateStatus(
    id: number,
    status: InboundEmailStatus,
    errorMessage: string | null,
  ): Promise<void> {
    await this.documents
      .findByIdAndUpdate(id, { processingStatus: status, errorMessage: errorMessage ?? null })
      .exec();
  }

  async listByAppAndCompany(
    app: string,
    companyId: number,
    filters: InboundEmailFilters,
  ): Promise<InboundEmailPage> {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 25;

    const query: Record<string, unknown> = { app, companyId };

    if (filters.status) {
      query["processingStatus"] = filters.status;
    }

    if (filters.dateFrom || filters.dateTo) {
      const createdAtFilter: Record<string, unknown> = {};
      if (filters.dateFrom) {
        createdAtFilter["$gte"] = new Date(filters.dateFrom);
      }
      if (filters.dateTo) {
        createdAtFilter["$lte"] = new Date(filters.dateTo);
      }
      query["createdAt"] = createdAtFilter;
    }

    const skip = (page - 1) * limit;

    const [rawItems, total] = await Promise.all([
      this.documents.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean().exec(),
      this.documents.countDocuments(query).exec(),
    ]);

    const items = this.toDomainList(rawItems);
    return { items, total };
  }

  async statsByAppAndCompany(app: string, companyId: number): Promise<InboundEmailStatusCounts> {
    const results = await this.documents
      .aggregate([
        { $match: { app, companyId } },
        { $group: { _id: "$processingStatus", count: { $sum: 1 } } },
      ])
      .exec();

    const counts: Record<string, number> = {};
    for (const row of results as Array<{ _id: string; count: number }>) {
      counts[row._id] = row.count;
    }

    const total = (Object.values(counts) as number[]).reduce(
      (sum: number, c: number) => sum + c,
      0,
    );

    return {
      total,
      completed: counts[InboundEmailStatus.COMPLETED] ?? 0,
      failed: counts[InboundEmailStatus.FAILED] ?? 0,
      unclassified: counts[InboundEmailStatus.UNCLASSIFIED] ?? 0,
      pending:
        (counts[InboundEmailStatus.PENDING] ?? 0) + (counts[InboundEmailStatus.PROCESSING] ?? 0),
    };
  }
}

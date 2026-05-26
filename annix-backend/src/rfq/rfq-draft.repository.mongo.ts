import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../lib/persistence/mongo-crud-repository";
import { RfqDraft } from "./entities/rfq-draft.entity";
import { RfqDraftRepository } from "./rfq-draft.repository";

@Injectable()
export class MongoRfqDraftRepository
  extends MongoCrudRepository<RfqDraft>
  implements RfqDraftRepository
{
  constructor(@InjectModel("RfqDraft") model: Model<RfqDraft>) {
    super(model);
  }

  async findByIdForUser(draftId: number, userId: number): Promise<RfqDraft | null> {
    const document = await this.documents
      .findOne({ _id: draftId, createdById: userId })
      .lean()
      .exec();
    return this.toDomain(document);
  }

  async findByDraftNumberForUser(draftNumber: string, userId: number): Promise<RfqDraft | null> {
    const document = await this.documents
      .findOne({ draftNumber, createdById: userId })
      .lean()
      .exec();
    return this.toDomain(document);
  }

  async findAllForUserWithConvertedRfq(userId: number): Promise<RfqDraft[]> {
    const documents = await this.documents
      .find({ createdById: userId })
      .populate("convertedRfq")
      .sort({ updatedAt: -1 })
      .lean()
      .exec();
    return this.toDomainList(documents);
  }

  async findLatestUnconvertedForCreator(userId: number): Promise<RfqDraft | null> {
    const document = await this.documents
      .findOne({ createdById: userId, isConverted: false })
      .sort({ updatedAt: -1 })
      .lean()
      .exec();
    return this.toDomain(document);
  }

  async findByIdWithCreator(id: number): Promise<RfqDraft | null> {
    const document = await this.documents.findById(id).populate("createdBy").lean().exec();
    return this.toDomain(document);
  }

  async searchPaginatedWithCreator(params: {
    search?: string;
    status?: string;
    customerId?: number;
    dateFrom?: Date;
    dateTo?: Date;
    sortBy: "projectName" | "createdAt";
    sortOrder: "ASC" | "DESC";
  }): Promise<{ items: RfqDraft[]; total: number }> {
    const filter: Record<string, unknown> = {};
    if (params.search) {
      const escaped = params.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter.$or = [
        { projectName: { $regex: escaped, $options: "i" } },
        { draftNumber: { $regex: escaped, $options: "i" } },
      ];
    }
    if (params.status === "DRAFT") {
      filter.isConverted = false;
    } else if (params.status === "PENDING") {
      filter.isConverted = true;
    }
    if (params.customerId) {
      filter.createdById = params.customerId;
    }
    if (params.dateFrom && params.dateTo) {
      filter.createdAt = { $gte: params.dateFrom, $lte: params.dateTo };
    }
    const sortField = params.sortBy === "projectName" ? "projectName" : "createdAt";
    const sortDir = params.sortOrder === "ASC" ? 1 : -1;
    const [documents, total] = await Promise.all([
      this.documents
        .find(filter)
        .populate("createdBy")
        .sort({ [sortField]: sortDir })
        .lean()
        .exec(),
      this.documents.countDocuments(filter).exec(),
    ]);
    return { items: this.toDomainList(documents), total };
  }
}

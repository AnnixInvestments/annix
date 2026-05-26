import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { NewsItem } from "../entities/news-item.entity";
import { NewsItemRepository } from "./news-item.repository";

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

@Injectable()
export class MongoNewsItemRepository
  extends MongoCrudRepository<NewsItem>
  implements NewsItemRepository
{
  constructor(@InjectModel("NewsItem") model: Model<NewsItem>) {
    super(model);
  }

  async findByUrlHash(urlHash: string): Promise<NewsItem | null> {
    const doc = await this.documents.findOne({ urlHash }).lean().exec();
    return this.toDomain(doc);
  }

  async deleteById(id: string): Promise<void> {
    await this.documents.deleteOne({ _id: id }).exec();
  }

  async updateById(id: string, changes: Partial<NewsItem>): Promise<void> {
    await this.documents.updateOne({ _id: id }, { $set: changes }).exec();
  }

  async findExtractedForSymbol(symbol: string, cutoff: Date, limit: number): Promise<NewsItem[]> {
    const docs = await this.documents
      .find({
        extractionStatus: "extracted",
        $or: [{ publishedAt: { $gte: cutoff } }, { createdAt: { $gte: cutoff } }],
        relatedSymbols: { $regex: escapeRegex(symbol), $options: "i" },
      })
      .sort({ publishedAt: -1 })
      .limit(limit)
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findExtractedHighImpact(cutoff: Date, limit: number): Promise<NewsItem[]> {
    const docs = await this.documents
      .find({
        extractionStatus: "extracted",
        $or: [{ publishedAt: { $gte: cutoff } }, { createdAt: { $gte: cutoff } }],
        impactLevel: { $in: ["high", "medium"] },
      })
      .sort({ publishedAt: -1 })
      .limit(limit)
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findByIds(ids: string[]): Promise<NewsItem[]> {
    const docs = await this.documents
      .find({ _id: { $in: ids } })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findExtractedMacro(cutoff: Date): Promise<NewsItem[]> {
    const docs = await this.documents
      .find({
        feedType: "macro",
        extractionStatus: "extracted",
        $or: [{ publishedAt: { $gte: cutoff } }, { createdAt: { $gte: cutoff } }],
      })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async purgeCreatedBefore(cutoff: Date): Promise<number> {
    const result = await this.documents.deleteMany({ createdAt: { $lt: cutoff } }).exec();
    return result.deletedCount ?? 0;
  }

  async findAndCountForList(params: {
    extractionStatus: string | null;
    symbol: string | null;
    limit: number;
    offset: number;
  }): Promise<{ rows: NewsItem[]; total: number }> {
    const filter: Record<string, unknown> = {};
    if (params.extractionStatus) filter.extractionStatus = params.extractionStatus;
    if (params.symbol) {
      filter.relatedSymbols = {
        $regex: escapeRegex(params.symbol.toUpperCase()),
        $options: "i",
      };
    }
    const [docs, total] = await Promise.all([
      this.documents
        .find(filter)
        .sort({ publishedAt: -1, createdAt: -1 })
        .skip(params.offset)
        .limit(params.limit)
        .lean()
        .exec(),
      this.documents.countDocuments(filter).exec(),
    ]);
    return { rows: this.toDomainList(docs), total };
  }
}

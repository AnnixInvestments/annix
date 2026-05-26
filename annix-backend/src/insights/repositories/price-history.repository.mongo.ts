import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import type { DeepPartial } from "../../lib/persistence/crud-repository";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { PriceHistory } from "../entities/price-history.entity";
import {
  type LatestPriceRow,
  PriceHistoryRepository,
  type SparklineRow,
} from "./price-history.repository";

function toIsoDate(value: unknown): string {
  if (typeof value === "string") {
    return value.slice(0, 10);
  }
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  return String(value).slice(0, 10);
}

@Injectable()
export class MongoPriceHistoryRepository
  extends MongoCrudRepository<PriceHistory>
  implements PriceHistoryRepository
{
  constructor(@InjectModel("PriceHistory") model: Model<PriceHistory>) {
    super(model);
  }

  async sparklineRows(assetIds: string[]): Promise<SparklineRow[]> {
    const docs = await this.documents
      .find({ assetId: { $in: assetIds } })
      .sort({ date: -1 })
      .lean()
      .exec();
    return docs.map((doc) => ({
      asset_id: String(doc.assetId),
      date: toIsoDate(doc.date),
      close: String(doc.close),
    }));
  }

  async latestForAsset(assetId: string): Promise<PriceHistory | null> {
    const doc = await this.documents.findOne({ assetId }).sort({ date: -1 }).lean().exec();
    return this.toDomain(doc);
  }

  async historyForAssetAsc(assetId: string, from?: string): Promise<PriceHistory[]> {
    const filter = from ? { assetId, date: { $gte: from } } : { assetId };
    const docs = await this.documents.find(filter).sort({ date: 1 }).lean().exec();
    return this.toDomainList(docs);
  }

  async historyForAssetDesc(assetId: string, take: number): Promise<PriceHistory[]> {
    const docs = await this.documents
      .find({ assetId })
      .sort({ date: -1 })
      .limit(take)
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  countForAsset(assetId: string): Promise<number> {
    return this.documents.countDocuments({ assetId }).exec();
  }

  async existingDates(assetId: string, dates: string[]): Promise<{ date: string }[]> {
    const docs = await this.documents.find({ assetId }).select({ date: 1 }).lean().exec();
    const wanted = new Set(dates.map((d) => d.slice(0, 10)));
    return docs.map((doc) => ({ date: toIsoDate(doc.date) })).filter((row) => wanted.has(row.date));
  }

  async insertIgnoringConflicts(rows: DeepPartial<PriceHistory>[]): Promise<void> {
    const operations = rows.map((row) => {
      const record = row as Record<string, unknown>;
      const { id, ...rest } = record;
      return {
        updateOne: {
          filter: { assetId: record.assetId, date: record.date },
          update: { $setOnInsert: { ...rest, ...(id !== undefined ? { _id: id } : {}) } },
          upsert: true,
        },
      };
    });
    if (operations.length === 0) {
      return;
    }
    await this.documents.bulkWrite(operations);
  }

  async latestPriceRows(assetIds: string[]): Promise<LatestPriceRow[]> {
    const docs = await this.documents.aggregate<{
      _id: string;
      close: unknown;
      date: unknown;
    }>([
      { $match: { assetId: { $in: assetIds } } },
      { $sort: { assetId: 1, date: -1 } },
      {
        $group: {
          _id: "$assetId",
          close: { $first: "$close" },
          date: { $first: "$date" },
        },
      },
    ]);
    return docs.map((doc) => ({
      asset_id: String(doc._id),
      close: String(doc.close),
      date: doc.date as string | Date,
    }));
  }
}

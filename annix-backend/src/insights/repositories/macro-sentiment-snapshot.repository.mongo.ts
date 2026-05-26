import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { MacroSentimentSnapshot } from "../entities/macro-sentiment-snapshot.entity";
import { MacroSentimentSnapshotRepository } from "./macro-sentiment-snapshot.repository";

function dayRange(snapshotDate: string): { $gte: Date; $lt: Date } {
  const start = new Date(`${snapshotDate.slice(0, 10)}T00:00:00.000Z`);
  const end = new Date(start.getTime() + 86400000);
  return { $gte: start, $lt: end };
}

@Injectable()
export class MongoMacroSentimentSnapshotRepository
  extends MongoCrudRepository<MacroSentimentSnapshot>
  implements MacroSentimentSnapshotRepository
{
  constructor(@InjectModel("MacroSentimentSnapshot") model: Model<MacroSentimentSnapshot>) {
    super(model);
  }

  async findByDate(snapshotDate: string): Promise<MacroSentimentSnapshot | null> {
    const doc = await this.documents
      .findOne({ snapshotDate: dayRange(snapshotDate) })
      .lean()
      .exec();
    return this.toDomain(doc);
  }

  async deleteById(id: string): Promise<void> {
    await this.documents.deleteOne({ _id: id }).exec();
  }

  async recentHistory(limit: number): Promise<MacroSentimentSnapshot[]> {
    const docs = await this.documents.find().sort({ snapshotDate: -1 }).limit(limit).lean().exec();
    return this.toDomainList(docs);
  }
}

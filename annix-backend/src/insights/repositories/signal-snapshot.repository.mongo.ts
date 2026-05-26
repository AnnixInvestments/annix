import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { SignalSnapshot } from "../entities/signal-snapshot.entity";
import { SignalSnapshotRepository } from "./signal-snapshot.repository";

function dayRange(snapshotDate: string): { $gte: Date; $lt: Date } {
  const start = new Date(`${snapshotDate.slice(0, 10)}T00:00:00.000Z`);
  const end = new Date(start.getTime() + 86400000);
  return { $gte: start, $lt: end };
}

@Injectable()
export class MongoSignalSnapshotRepository
  extends MongoCrudRepository<SignalSnapshot>
  implements SignalSnapshotRepository
{
  constructor(@InjectModel("SignalSnapshot") model: Model<SignalSnapshot>) {
    super(model);
  }

  async findByAssetAndDate(assetId: string, snapshotDate: string): Promise<SignalSnapshot | null> {
    const doc = await this.documents
      .findOne({ assetId, snapshotDate: dayRange(snapshotDate) })
      .lean()
      .exec();
    return this.toDomain(doc);
  }

  async deleteById(id: string): Promise<void> {
    await this.documents.deleteOne({ _id: id }).exec();
  }

  async findForAssetsOrderedByDate(assetIds: string[]): Promise<SignalSnapshot[]> {
    const docs = await this.documents
      .find({ assetId: { $in: assetIds } })
      .sort({ assetId: 1, snapshotDate: -1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findLatestPerAssetWithAsset(): Promise<SignalSnapshot[]> {
    const docs = await this.documents
      .find()
      .sort({ assetId: 1, snapshotDate: -1 })
      .populate("asset")
      .lean()
      .exec();
    const latestByAsset = new Map<string, SignalSnapshot>();
    for (const doc of docs) {
      const domain = this.toDomain(doc) as SignalSnapshot;
      if (latestByAsset.has(String(domain.assetId))) {
        continue;
      }
      latestByAsset.set(String(domain.assetId), domain);
    }
    return Array.from(latestByAsset.values()).sort(
      (a, b) => Number(b.opportunityScore) - Number(a.opportunityScore),
    );
  }

  async findHistoryForAsset(assetId: string, take: number): Promise<SignalSnapshot[]> {
    const docs = await this.documents
      .find({ assetId })
      .populate("asset")
      .sort({ snapshotDate: -1 })
      .limit(take)
      .lean()
      .exec();
    return this.toDomainList(docs);
  }
}

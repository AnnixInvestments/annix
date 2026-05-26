import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { WatchlistItem } from "../entities/watchlist-item.entity";
import { WatchlistItemRepository } from "./watchlist-item.repository";

@Injectable()
export class MongoWatchlistItemRepository
  extends MongoCrudRepository<WatchlistItem>
  implements WatchlistItemRepository
{
  constructor(@InjectModel("WatchlistItem") model: Model<WatchlistItem>) {
    super(model);
  }

  async findAllWithAsset(): Promise<WatchlistItem[]> {
    const docs = await this.documents.find().populate("asset").sort({ addedAt: -1 }).lean().exec();
    return this.toDomainList(docs);
  }

  async findByAssetId(assetId: string): Promise<WatchlistItem | null> {
    const doc = await this.documents.findOne({ assetId }).lean().exec();
    return this.toDomain(doc);
  }

  async findByIdWithAsset(id: string): Promise<WatchlistItem | null> {
    const doc = await this.documents.findById(id).populate("asset").lean().exec();
    return this.toDomain(doc);
  }

  async deleteById(id: string): Promise<boolean> {
    const result = await this.documents.deleteOne({ _id: id }).exec();
    return result.deletedCount > 0;
  }
}

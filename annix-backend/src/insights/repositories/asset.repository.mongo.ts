import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { Asset } from "../entities/asset.entity";
import { AssetRepository } from "./asset.repository";

@Injectable()
export class MongoAssetRepository extends MongoCrudRepository<Asset> implements AssetRepository {
  constructor(@InjectModel("Asset") model: Model<Asset>) {
    super(model);
  }

  async findBySymbol(symbol: string): Promise<Asset | null> {
    const doc = await this.documents.findOne({ symbol }).lean().exec();
    return this.toDomain(doc);
  }

  async findActive(): Promise<Asset[]> {
    const docs = await this.documents.find({ isActive: true }).lean().exec();
    return this.toDomainList(docs);
  }

  async updateById(id: string, changes: Partial<Asset>): Promise<void> {
    await this.documents.updateOne({ _id: id }, { $set: changes }).exec();
  }
}

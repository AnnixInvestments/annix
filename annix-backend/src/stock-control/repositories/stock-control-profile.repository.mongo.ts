import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import type { DeepPartial } from "../../lib/persistence/crud-repository";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { StockControlProfile } from "../entities/stock-control-profile.entity";
import { StockControlProfileRepository } from "./stock-control-profile.repository";

@Injectable()
export class MongoStockControlProfileRepository
  extends MongoCrudRepository<StockControlProfile>
  implements StockControlProfileRepository
{
  constructor(@InjectModel("StockControlProfile") model: Model<StockControlProfile>) {
    super(model);
  }

  async findOneByUserId(userId: number): Promise<StockControlProfile | null> {
    const doc = await this.documents.findOne({ userId }).lean().exec();
    return this.toDomain(doc);
  }

  async findOneByUserIdWithRelations(
    userId: number,
    relations: string[],
  ): Promise<StockControlProfile | null> {
    const doc = await this.documents.findOne({ userId }).populate(relations).lean().exec();
    return this.toDomain(doc);
  }

  async findOneOrFailByUserId(userId: number): Promise<StockControlProfile> {
    const profile = await this.findOneByUserId(userId);
    if (!profile) {
      throw new NotFoundException("StockControlProfile not found");
    }
    return profile;
  }

  async updateByUserId(userId: number, updates: DeepPartial<StockControlProfile>): Promise<void> {
    await this.documents.updateOne({ userId }, { $set: updates }).exec();
  }
}

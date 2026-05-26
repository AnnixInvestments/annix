import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import type { DeepPartial } from "../../lib/persistence/crud-repository";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { StockControlCompany } from "../entities/stock-control-company.entity";
import { StockControlCompanyRepository } from "./stock-control-company.repository";

@Injectable()
export class MongoStockControlCompanyRepository
  extends MongoCrudRepository<StockControlCompany>
  implements StockControlCompanyRepository
{
  constructor(@InjectModel("StockControlCompany") model: Model<StockControlCompany>) {
    super(model);
  }

  async updateById(id: number, updates: DeepPartial<StockControlCompany>): Promise<void> {
    await this.documents.updateOne({ _id: id }, { $set: updates }).exec();
  }
}

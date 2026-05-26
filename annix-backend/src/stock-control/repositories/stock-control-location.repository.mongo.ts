import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { StockControlLocation } from "../entities/stock-control-location.entity";
import { StockControlLocationRepository } from "./stock-control-location.repository";

@Injectable()
export class MongoStockControlLocationRepository
  extends MongoCrudRepository<StockControlLocation>
  implements StockControlLocationRepository
{
  constructor(@InjectModel("StockControlLocation") model: Model<StockControlLocation>) {
    super(model);
  }

  async findActiveForCompanyOrdered(companyId: number): Promise<StockControlLocation[]> {
    const docs = await this.documents
      .find({ companyId, active: true })
      .sort({ displayOrder: 1, name: 1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findAllForCompanyOrdered(companyId: number): Promise<StockControlLocation[]> {
    const docs = await this.documents
      .find({ companyId })
      .sort({ displayOrder: 1, name: 1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findOneForCompany(id: number, companyId: number): Promise<StockControlLocation | null> {
    const doc = await this.documents.findOne({ _id: id, companyId }).lean().exec();
    return this.toDomain(doc);
  }
}

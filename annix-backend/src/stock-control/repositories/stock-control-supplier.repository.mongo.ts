import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import type { DeepPartial } from "../../lib/persistence/crud-repository";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { StockControlSupplier } from "../entities/stock-control-supplier.entity";
import { StockControlSupplierRepository } from "./stock-control-supplier.repository";

@Injectable()
export class MongoStockControlSupplierRepository
  extends MongoCrudRepository<StockControlSupplier>
  implements StockControlSupplierRepository
{
  constructor(@InjectModel("StockControlSupplier") model: Model<StockControlSupplier>) {
    super(model);
  }

  build(data: DeepPartial<StockControlSupplier>): StockControlSupplier {
    return data as StockControlSupplier;
  }

  async findAllForCompanyOrderedByName(companyId: number): Promise<StockControlSupplier[]> {
    const docs = await this.documents.find({ companyId }).sort({ name: 1 }).lean().exec();
    return this.toDomainList(docs);
  }

  async findAllForCompany(companyId: number): Promise<StockControlSupplier[]> {
    const docs = await this.documents.find({ companyId }).lean().exec();
    return this.toDomainList(docs);
  }

  async findOneForCompany(id: number, companyId: number): Promise<StockControlSupplier | null> {
    const doc = await this.documents.findOne({ _id: id, companyId }).lean().exec();
    return this.toDomain(doc);
  }

  async findOneForCompanyByNameCaseInsensitive(
    companyId: number,
    name: string,
  ): Promise<StockControlSupplier | null> {
    const pattern = new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i");
    const doc = await this.documents.findOne({ companyId, name: pattern }).lean().exec();
    return this.toDomain(doc);
  }
}

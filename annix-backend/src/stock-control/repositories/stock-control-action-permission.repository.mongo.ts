import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { StockControlActionPermission } from "../entities/stock-control-action-permission.entity";
import { StockControlActionPermissionRepository } from "./stock-control-action-permission.repository";

@Injectable()
export class MongoStockControlActionPermissionRepository
  extends MongoCrudRepository<StockControlActionPermission>
  implements StockControlActionPermissionRepository
{
  constructor(
    @InjectModel("StockControlActionPermission")
    model: Model<StockControlActionPermission>,
  ) {
    super(model);
  }

  async findForCompany(companyId: number): Promise<StockControlActionPermission[]> {
    const docs = await this.documents.find({ companyId }).lean().exec();
    return this.toDomainList(docs);
  }
}

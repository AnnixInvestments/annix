import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { StockControlRbacConfig } from "../entities/stock-control-rbac-config.entity";
import { StockControlRbacConfigRepository } from "./stock-control-rbac-config.repository";

@Injectable()
export class MongoStockControlRbacConfigRepository
  extends MongoCrudRepository<StockControlRbacConfig>
  implements StockControlRbacConfigRepository
{
  constructor(@InjectModel("StockControlRbacConfig") model: Model<StockControlRbacConfig>) {
    super(model);
  }

  async findForCompany(companyId: number): Promise<StockControlRbacConfig[]> {
    const docs = await this.documents.find({ companyId }).lean().exec();
    return this.toDomainList(docs);
  }
}

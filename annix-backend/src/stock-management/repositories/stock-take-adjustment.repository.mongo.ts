import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { StockTakeAdjustment } from "../entities/stock-take-adjustment.entity";
import { StockTakeAdjustmentRepository } from "./stock-take-adjustment.repository";

@Injectable()
export class MongoStockTakeAdjustmentRepository
  extends MongoCrudRepository<StockTakeAdjustment>
  implements StockTakeAdjustmentRepository
{
  constructor(@InjectModel("StockTakeAdjustment") model: Model<StockTakeAdjustment>) {
    super(model);
  }
}

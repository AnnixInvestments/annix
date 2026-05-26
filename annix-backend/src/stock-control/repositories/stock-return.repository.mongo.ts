import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { StockReturn } from "../entities/stock-return.entity";
import { StockReturnRepository } from "./stock-return.repository";

@Injectable()
export class MongoStockReturnRepository
  extends MongoCrudRepository<StockReturn>
  implements StockReturnRepository
{
  constructor(@InjectModel("StockReturn") model: Model<StockReturn>) {
    super(model);
  }
}

import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { StockTakeAdjustment } from "../entities/stock-take-adjustment.entity";
import { StockTakeAdjustmentRepository } from "./stock-take-adjustment.repository";

@Injectable()
export class PostgresStockTakeAdjustmentRepository
  extends TypeOrmCrudRepository<StockTakeAdjustment>
  implements StockTakeAdjustmentRepository
{
  constructor(@InjectRepository(StockTakeAdjustment) repository: Repository<StockTakeAdjustment>) {
    super(repository);
  }
}

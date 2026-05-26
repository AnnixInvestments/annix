import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { StockReturn } from "../entities/stock-return.entity";
import { StockReturnRepository } from "./stock-return.repository";

@Injectable()
export class PostgresStockReturnRepository
  extends TypeOrmCrudRepository<StockReturn>
  implements StockReturnRepository
{
  constructor(@InjectRepository(StockReturn) repository: Repository<StockReturn>) {
    super(repository);
  }
}

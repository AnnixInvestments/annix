import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, type DeepPartial as TypeOrmDeepPartial } from "typeorm";
import type { DeepPartial } from "../../lib/persistence/crud-repository";
import {
  type TransactionContext,
  TypeOrmTransactionContext,
} from "../../lib/persistence/transaction-context";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { RubberOffcutStock } from "../entities/rubber-offcut-stock.entity";
import { RubberOffcutStockRepository } from "./rubber-offcut-stock.repository";

@Injectable()
export class PostgresRubberOffcutStockRepository
  extends TypeOrmCrudRepository<RubberOffcutStock>
  implements RubberOffcutStockRepository
{
  constructor(@InjectRepository(RubberOffcutStock) repository: Repository<RubberOffcutStock>) {
    super(repository);
  }

  build(data: DeepPartial<RubberOffcutStock>): RubberOffcutStock {
    return this.repository.create(data as TypeOrmDeepPartial<RubberOffcutStock>);
  }

  withTransaction(context: TransactionContext): PostgresRubberOffcutStockRepository {
    if (!(context instanceof TypeOrmTransactionContext)) {
      throw new Error("PostgresRubberOffcutStockRepository requires a TypeOrmTransactionContext");
    }
    return new PostgresRubberOffcutStockRepository(
      context.manager.getRepository(RubberOffcutStock),
    );
  }
}

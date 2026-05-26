import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, type DeepPartial as TypeOrmDeepPartial } from "typeorm";
import type { DeepPartial } from "../../lib/persistence/crud-repository";
import {
  type TransactionContext,
  TypeOrmTransactionContext,
} from "../../lib/persistence/transaction-context";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { RubberOffcutReturn } from "../entities/rubber-offcut-return.entity";
import { RubberOffcutReturnRepository } from "./rubber-offcut-return.repository";

@Injectable()
export class PostgresRubberOffcutReturnRepository
  extends TypeOrmCrudRepository<RubberOffcutReturn>
  implements RubberOffcutReturnRepository
{
  constructor(@InjectRepository(RubberOffcutReturn) repository: Repository<RubberOffcutReturn>) {
    super(repository);
  }

  build(data: DeepPartial<RubberOffcutReturn>): RubberOffcutReturn {
    return this.repository.create(data as TypeOrmDeepPartial<RubberOffcutReturn>);
  }

  withTransaction(context: TransactionContext): PostgresRubberOffcutReturnRepository {
    if (!(context instanceof TypeOrmTransactionContext)) {
      throw new Error("PostgresRubberOffcutReturnRepository requires a TypeOrmTransactionContext");
    }
    return new PostgresRubberOffcutReturnRepository(
      context.manager.getRepository(RubberOffcutReturn),
    );
  }
}

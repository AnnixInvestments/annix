import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, type DeepPartial as TypeOrmDeepPartial } from "typeorm";
import type { DeepPartial } from "../../lib/persistence/crud-repository";
import {
  type TransactionContext,
  TypeOrmTransactionContext,
} from "../../lib/persistence/transaction-context";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { ConsumableReturn } from "../entities/consumable-return.entity";
import { ConsumableReturnRepository } from "./consumable-return.repository";

@Injectable()
export class PostgresConsumableReturnRepository
  extends TypeOrmCrudRepository<ConsumableReturn>
  implements ConsumableReturnRepository
{
  constructor(@InjectRepository(ConsumableReturn) repository: Repository<ConsumableReturn>) {
    super(repository);
  }

  build(data: DeepPartial<ConsumableReturn>): ConsumableReturn {
    return this.repository.create(data as TypeOrmDeepPartial<ConsumableReturn>);
  }

  withTransaction(context: TransactionContext): PostgresConsumableReturnRepository {
    if (!(context instanceof TypeOrmTransactionContext)) {
      throw new Error("PostgresConsumableReturnRepository requires a TypeOrmTransactionContext");
    }
    return new PostgresConsumableReturnRepository(context.manager.getRepository(ConsumableReturn));
  }
}

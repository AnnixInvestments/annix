import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, type DeepPartial as TypeOrmDeepPartial } from "typeorm";
import type { DeepPartial } from "../../lib/persistence/crud-repository";
import {
  type TransactionContext,
  TypeOrmTransactionContext,
} from "../../lib/persistence/transaction-context";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { ConsumableIssuanceRow } from "../entities/consumable-issuance-row.entity";
import { ConsumableIssuanceRowRepository } from "./consumable-issuance-row.repository";

@Injectable()
export class PostgresConsumableIssuanceRowRepository
  extends TypeOrmCrudRepository<ConsumableIssuanceRow>
  implements ConsumableIssuanceRowRepository
{
  constructor(
    @InjectRepository(ConsumableIssuanceRow) repository: Repository<ConsumableIssuanceRow>,
  ) {
    super(repository);
  }

  build(data: DeepPartial<ConsumableIssuanceRow>): ConsumableIssuanceRow {
    return this.repository.create(data as TypeOrmDeepPartial<ConsumableIssuanceRow>);
  }

  withTransaction(context: TransactionContext): PostgresConsumableIssuanceRowRepository {
    if (!(context instanceof TypeOrmTransactionContext)) {
      throw new Error(
        "PostgresConsumableIssuanceRowRepository requires a TypeOrmTransactionContext",
      );
    }
    return new PostgresConsumableIssuanceRowRepository(
      context.manager.getRepository(ConsumableIssuanceRow),
    );
  }
}

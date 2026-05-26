import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, type DeepPartial as TypeOrmDeepPartial } from "typeorm";
import type { DeepPartial } from "../../lib/persistence/crud-repository";
import {
  type TransactionContext,
  TypeOrmTransactionContext,
} from "../../lib/persistence/transaction-context";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { RubberRollIssuanceRow } from "../entities/rubber-roll-issuance-row.entity";
import { RubberRollIssuanceRowRepository } from "./rubber-roll-issuance-row.repository";

@Injectable()
export class PostgresRubberRollIssuanceRowRepository
  extends TypeOrmCrudRepository<RubberRollIssuanceRow>
  implements RubberRollIssuanceRowRepository
{
  constructor(
    @InjectRepository(RubberRollIssuanceRow) repository: Repository<RubberRollIssuanceRow>,
  ) {
    super(repository);
  }

  build(data: DeepPartial<RubberRollIssuanceRow>): RubberRollIssuanceRow {
    return this.repository.create(data as TypeOrmDeepPartial<RubberRollIssuanceRow>);
  }

  withTransaction(context: TransactionContext): PostgresRubberRollIssuanceRowRepository {
    if (!(context instanceof TypeOrmTransactionContext)) {
      throw new Error(
        "PostgresRubberRollIssuanceRowRepository requires a TypeOrmTransactionContext",
      );
    }
    return new PostgresRubberRollIssuanceRowRepository(
      context.manager.getRepository(RubberRollIssuanceRow),
    );
  }
}

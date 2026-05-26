import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, type DeepPartial as TypeOrmDeepPartial } from "typeorm";
import type { DeepPartial } from "../../lib/persistence/crud-repository";
import {
  type TransactionContext,
  TypeOrmTransactionContext,
} from "../../lib/persistence/transaction-context";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { SolutionIssuanceRow } from "../entities/solution-issuance-row.entity";
import { SolutionIssuanceRowRepository } from "./solution-issuance-row.repository";

@Injectable()
export class PostgresSolutionIssuanceRowRepository
  extends TypeOrmCrudRepository<SolutionIssuanceRow>
  implements SolutionIssuanceRowRepository
{
  constructor(@InjectRepository(SolutionIssuanceRow) repository: Repository<SolutionIssuanceRow>) {
    super(repository);
  }

  build(data: DeepPartial<SolutionIssuanceRow>): SolutionIssuanceRow {
    return this.repository.create(data as TypeOrmDeepPartial<SolutionIssuanceRow>);
  }

  withTransaction(context: TransactionContext): PostgresSolutionIssuanceRowRepository {
    if (!(context instanceof TypeOrmTransactionContext)) {
      throw new Error("PostgresSolutionIssuanceRowRepository requires a TypeOrmTransactionContext");
    }
    return new PostgresSolutionIssuanceRowRepository(
      context.manager.getRepository(SolutionIssuanceRow),
    );
  }
}

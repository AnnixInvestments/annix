import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, type DeepPartial as TypeOrmDeepPartial } from "typeorm";
import type { DeepPartial } from "../../lib/persistence/crud-repository";
import {
  type TransactionContext,
  TypeOrmTransactionContext,
} from "../../lib/persistence/transaction-context";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { PaintIssuanceRow } from "../entities/paint-issuance-row.entity";
import { PaintIssuanceRowRepository } from "./paint-issuance-row.repository";

@Injectable()
export class PostgresPaintIssuanceRowRepository
  extends TypeOrmCrudRepository<PaintIssuanceRow>
  implements PaintIssuanceRowRepository
{
  constructor(@InjectRepository(PaintIssuanceRow) repository: Repository<PaintIssuanceRow>) {
    super(repository);
  }

  build(data: DeepPartial<PaintIssuanceRow>): PaintIssuanceRow {
    return this.repository.create(data as TypeOrmDeepPartial<PaintIssuanceRow>);
  }

  withTransaction(context: TransactionContext): PostgresPaintIssuanceRowRepository {
    if (!(context instanceof TypeOrmTransactionContext)) {
      throw new Error("PostgresPaintIssuanceRowRepository requires a TypeOrmTransactionContext");
    }
    return new PostgresPaintIssuanceRowRepository(context.manager.getRepository(PaintIssuanceRow));
  }
}

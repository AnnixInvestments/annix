import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, type DeepPartial as TypeOrmDeepPartial } from "typeorm";
import type { DeepPartial } from "../../lib/persistence/crud-repository";
import {
  type TransactionContext,
  TypeOrmTransactionContext,
} from "../../lib/persistence/transaction-context";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { RubberWastageEntry } from "../entities/rubber-wastage-entry.entity";
import { RubberWastageEntryRepository } from "./rubber-wastage-entry.repository";

@Injectable()
export class PostgresRubberWastageEntryRepository
  extends TypeOrmCrudRepository<RubberWastageEntry>
  implements RubberWastageEntryRepository
{
  constructor(@InjectRepository(RubberWastageEntry) repository: Repository<RubberWastageEntry>) {
    super(repository);
  }

  build(data: DeepPartial<RubberWastageEntry>): RubberWastageEntry {
    return this.repository.create(data as TypeOrmDeepPartial<RubberWastageEntry>);
  }

  withTransaction(context: TransactionContext): PostgresRubberWastageEntryRepository {
    if (!(context instanceof TypeOrmTransactionContext)) {
      throw new Error("PostgresRubberWastageEntryRepository requires a TypeOrmTransactionContext");
    }
    return new PostgresRubberWastageEntryRepository(
      context.manager.getRepository(RubberWastageEntry),
    );
  }
}

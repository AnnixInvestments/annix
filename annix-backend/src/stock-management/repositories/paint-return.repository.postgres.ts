import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, type DeepPartial as TypeOrmDeepPartial } from "typeorm";
import type { DeepPartial } from "../../lib/persistence/crud-repository";
import {
  type TransactionContext,
  TypeOrmTransactionContext,
} from "../../lib/persistence/transaction-context";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { PaintReturn } from "../entities/paint-return.entity";
import { PaintReturnRepository } from "./paint-return.repository";

@Injectable()
export class PostgresPaintReturnRepository
  extends TypeOrmCrudRepository<PaintReturn>
  implements PaintReturnRepository
{
  constructor(@InjectRepository(PaintReturn) repository: Repository<PaintReturn>) {
    super(repository);
  }

  build(data: DeepPartial<PaintReturn>): PaintReturn {
    return this.repository.create(data as TypeOrmDeepPartial<PaintReturn>);
  }

  withTransaction(context: TransactionContext): PostgresPaintReturnRepository {
    if (!(context instanceof TypeOrmTransactionContext)) {
      throw new Error("PostgresPaintReturnRepository requires a TypeOrmTransactionContext");
    }
    return new PostgresPaintReturnRepository(context.manager.getRepository(PaintReturn));
  }
}

import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, type DeepPartial as TypeOrmDeepPartial } from "typeorm";
import type { DeepPartial } from "../../lib/persistence/crud-repository";
import {
  type TransactionContext,
  TypeOrmTransactionContext,
} from "../../lib/persistence/transaction-context";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { RubberWastageBin } from "../entities/rubber-wastage-bin.entity";
import { RubberWastageBinRepository } from "./rubber-wastage-bin.repository";

@Injectable()
export class PostgresRubberWastageBinRepository
  extends TypeOrmCrudRepository<RubberWastageBin>
  implements RubberWastageBinRepository
{
  constructor(@InjectRepository(RubberWastageBin) repository: Repository<RubberWastageBin>) {
    super(repository);
  }

  build(data: DeepPartial<RubberWastageBin>): RubberWastageBin {
    return this.repository.create(data as TypeOrmDeepPartial<RubberWastageBin>);
  }

  withTransaction(context: TransactionContext): PostgresRubberWastageBinRepository {
    if (!(context instanceof TypeOrmTransactionContext)) {
      throw new Error("PostgresRubberWastageBinRepository requires a TypeOrmTransactionContext");
    }
    return new PostgresRubberWastageBinRepository(context.manager.getRepository(RubberWastageBin));
  }

  findActiveForCompany(companyId: number): Promise<RubberWastageBin[]> {
    return this.repository.find({
      where: { companyId, active: true },
      order: { colour: "ASC" },
    });
  }

  findByColour(companyId: number, colour: string): Promise<RubberWastageBin | null> {
    return this.repository.findOne({ where: { companyId, colour } });
  }

  findByIdForCompany(companyId: number, id: number): Promise<RubberWastageBin | null> {
    return this.repository.findOne({ where: { id, companyId } });
  }
}

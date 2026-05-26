import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, type DeepPartial as TypeOrmDeepPartial } from "typeorm";
import type { DeepPartial } from "../../lib/persistence/crud-repository";
import {
  type TransactionContext,
  TypeOrmTransactionContext,
} from "../../lib/persistence/transaction-context";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { ReturnSession } from "../entities/return-session.entity";
import { ReturnSessionRepository } from "./return-session.repository";

@Injectable()
export class PostgresReturnSessionRepository
  extends TypeOrmCrudRepository<ReturnSession>
  implements ReturnSessionRepository
{
  constructor(@InjectRepository(ReturnSession) repository: Repository<ReturnSession>) {
    super(repository);
  }

  build(data: DeepPartial<ReturnSession>): ReturnSession {
    return this.repository.create(data as TypeOrmDeepPartial<ReturnSession>);
  }

  withTransaction(context: TransactionContext): PostgresReturnSessionRepository {
    if (!(context instanceof TypeOrmTransactionContext)) {
      throw new Error("PostgresReturnSessionRepository requires a TypeOrmTransactionContext");
    }
    return new PostgresReturnSessionRepository(context.manager.getRepository(ReturnSession));
  }

  findOutstandingForCompany(companyId: number): Promise<ReturnSession[]> {
    return this.repository.find({
      where: { companyId, status: "pending" },
      relations: { offcutReturns: true, paintReturns: true, consumableReturns: true },
      order: { createdAt: "DESC" },
    });
  }

  findByIdForCompany(companyId: number, id: number): Promise<ReturnSession | null> {
    return this.repository.findOne({ where: { id, companyId } });
  }

  findByIdWithReturns(id: number): Promise<ReturnSession | null> {
    return this.repository.findOne({
      where: { id },
      relations: { offcutReturns: true, paintReturns: true, consumableReturns: true },
    });
  }

  findByIdWithOffcutReturns(id: number): Promise<ReturnSession | null> {
    return this.repository.findOne({
      where: { id },
      relations: { offcutReturns: true },
    });
  }
}

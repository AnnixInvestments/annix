import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { type FindOptionsWhere, Repository, type DeepPartial as TypeOrmDeepPartial } from "typeorm";
import type { DeepPartial } from "../../lib/persistence/crud-repository";
import {
  type TransactionContext,
  TypeOrmTransactionContext,
} from "../../lib/persistence/transaction-context";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { IssuanceSession } from "../entities/issuance-session.entity";
import {
  IssuanceSessionRepository,
  type IssuanceSessionWhere,
} from "./issuance-session.repository";

const FULL_RELATIONS = {
  rows: {
    product: true,
    consumable: true,
    paint: true,
    rubberRoll: true,
    solution: true,
  },
};

@Injectable()
export class PostgresIssuanceSessionRepository
  extends TypeOrmCrudRepository<IssuanceSession>
  implements IssuanceSessionRepository
{
  constructor(@InjectRepository(IssuanceSession) repository: Repository<IssuanceSession>) {
    super(repository);
  }

  build(data: DeepPartial<IssuanceSession>): IssuanceSession {
    return this.repository.create(data as TypeOrmDeepPartial<IssuanceSession>);
  }

  withTransaction(context: TransactionContext): PostgresIssuanceSessionRepository {
    if (!(context instanceof TypeOrmTransactionContext)) {
      throw new Error("PostgresIssuanceSessionRepository requires a TypeOrmTransactionContext");
    }
    return new PostgresIssuanceSessionRepository(context.manager.getRepository(IssuanceSession));
  }

  findByIdWithFullRelations(id: number): Promise<IssuanceSession | null> {
    return this.repository.findOne({
      where: { id },
      relations: FULL_RELATIONS,
    });
  }

  findByIdForCompanyWithFullRelations(
    companyId: number,
    id: number,
  ): Promise<IssuanceSession | null> {
    return this.repository.findOne({
      where: { id, companyId },
      relations: FULL_RELATIONS,
    });
  }

  async findPaginatedForCompany(
    where: IssuanceSessionWhere,
    skip: number,
    take: number,
  ): Promise<{ items: IssuanceSession[]; total: number }> {
    const criteria: FindOptionsWhere<IssuanceSession> = { companyId: where.companyId };
    if (where.status) {
      criteria.status = where.status;
    }
    if (where.sessionKind) {
      criteria.sessionKind = where.sessionKind;
    }
    if (where.cpoId !== undefined) {
      criteria.cpoId = where.cpoId;
    }
    if (where.issuerStaffId !== undefined) {
      criteria.issuerStaffId = where.issuerStaffId;
    }
    if (where.recipientStaffId !== undefined) {
      criteria.recipientStaffId = where.recipientStaffId;
    }
    const [items, total] = await this.repository.findAndCount({
      where: criteria,
      relations: FULL_RELATIONS,
      order: { createdAt: "DESC" },
      skip,
      take,
    });
    return { items, total };
  }
}

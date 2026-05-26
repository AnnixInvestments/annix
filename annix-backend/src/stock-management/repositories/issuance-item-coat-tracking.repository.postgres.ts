import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, type DeepPartial as TypeOrmDeepPartial } from "typeorm";
import type { DeepPartial } from "../../lib/persistence/crud-repository";
import {
  type TransactionContext,
  TypeOrmTransactionContext,
} from "../../lib/persistence/transaction-context";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { IssuanceItemCoatTracking } from "../entities/issuance-item-coat-tracking.entity";
import { IssuanceItemCoatTrackingRepository } from "./issuance-item-coat-tracking.repository";

@Injectable()
export class PostgresIssuanceItemCoatTrackingRepository
  extends TypeOrmCrudRepository<IssuanceItemCoatTracking>
  implements IssuanceItemCoatTrackingRepository
{
  constructor(
    @InjectRepository(IssuanceItemCoatTracking) repository: Repository<IssuanceItemCoatTracking>,
  ) {
    super(repository);
  }

  build(data: DeepPartial<IssuanceItemCoatTracking>): IssuanceItemCoatTracking {
    return this.repository.create(data as TypeOrmDeepPartial<IssuanceItemCoatTracking>);
  }

  withTransaction(context: TransactionContext): PostgresIssuanceItemCoatTrackingRepository {
    if (!(context instanceof TypeOrmTransactionContext)) {
      throw new Error(
        "PostgresIssuanceItemCoatTrackingRepository requires a TypeOrmTransactionContext",
      );
    }
    return new PostgresIssuanceItemCoatTrackingRepository(
      context.manager.getRepository(IssuanceItemCoatTracking),
    );
  }
}

import { Injectable, Optional } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { ClientSession, Model } from "mongoose";
import { MongoTenantScopedRepository } from "../../lib/persistence/mongo-tenant-scoped-repository";
import {
  MongoTransactionContext,
  type TransactionContext,
} from "../../lib/persistence/transaction-context";
import { IssuanceSession } from "../entities/issuance-session.entity";
import { IssuanceSessionRepository } from "./issuance-session.repository";

@Injectable()
export class MongoIssuanceSessionRepository
  extends MongoTenantScopedRepository<IssuanceSession>
  implements IssuanceSessionRepository
{
  constructor(
    @InjectModel("IssuanceSession") model: Model<IssuanceSession>,
    @Optional() session: ClientSession | null = null,
  ) {
    super(model, session);
  }

  withTransaction(context: TransactionContext): MongoIssuanceSessionRepository {
    if (!(context instanceof MongoTransactionContext)) {
      throw new Error("MongoIssuanceSessionRepository requires a MongoTransactionContext");
    }
    return this.cloneForSession(context.session);
  }

  protected cloneForSession(session: ClientSession): MongoIssuanceSessionRepository {
    return new MongoIssuanceSessionRepository(this.model, session);
  }

  async saveForCompany(companyId: number, entity: IssuanceSession): Promise<IssuanceSession> {
    if (entity.companyId !== companyId) {
      throw new Error("Issuance session does not belong to the requesting company");
    }
    return this.save(entity);
  }

  async removeForCompany(companyId: number, entity: IssuanceSession): Promise<void> {
    if (entity.companyId !== companyId) {
      throw new Error("Issuance session does not belong to the requesting company");
    }
    await this.remove(entity);
  }
}

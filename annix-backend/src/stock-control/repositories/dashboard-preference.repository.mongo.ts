import { Injectable, Optional } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { ClientSession, Model } from "mongoose";
import { MongoTenantScopedRepository } from "../../lib/persistence/mongo-tenant-scoped-repository";
import {
  MongoTransactionContext,
  type TransactionContext,
} from "../../lib/persistence/transaction-context";
import { DashboardPreference } from "../entities/dashboard-preference.entity";
import { DashboardPreferenceRepository } from "./dashboard-preference.repository";

@Injectable()
export class MongoDashboardPreferenceRepository
  extends MongoTenantScopedRepository<DashboardPreference>
  implements DashboardPreferenceRepository
{
  constructor(
    @InjectModel("DashboardPreference")
    model: Model<DashboardPreference>,
    @Optional() session: ClientSession | null = null,
  ) {
    super(model, session);
  }

  withTransaction(context: TransactionContext): MongoDashboardPreferenceRepository {
    if (!(context instanceof MongoTransactionContext)) {
      throw new Error("MongoDashboardPreferenceRepository requires a MongoTransactionContext");
    }
    return this.cloneForSession(context.session);
  }

  protected cloneForSession(session: ClientSession): MongoDashboardPreferenceRepository {
    return new MongoDashboardPreferenceRepository(this.model, session);
  }

  async saveForCompany(
    companyId: number,
    entity: DashboardPreference,
  ): Promise<DashboardPreference> {
    if (entity.companyId !== companyId) {
      throw new Error("Dashboard preference does not belong to the requesting company");
    }
    return this.save(entity);
  }

  async removeForCompany(companyId: number, entity: DashboardPreference): Promise<void> {
    if (entity.companyId !== companyId) {
      throw new Error("Dashboard preference does not belong to the requesting company");
    }
    await this.remove(entity);
  }

  async findOneForUser(companyId: number, userId: number): Promise<DashboardPreference | null> {
    const doc = await this.documents.findOne({ companyId, userId }).lean().exec();
    return this.toDomain(doc);
  }
}

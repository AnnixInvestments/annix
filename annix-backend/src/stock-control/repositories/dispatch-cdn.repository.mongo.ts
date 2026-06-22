import { Injectable, Optional } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { ClientSession, Model } from "mongoose";
import { type DeepPartial } from "../../lib/persistence/crud-repository";
import { MongoTenantScopedRepository } from "../../lib/persistence/mongo-tenant-scoped-repository";
import {
  MongoTransactionContext,
  type TransactionContext,
} from "../../lib/persistence/transaction-context";
import { DispatchCdn } from "../entities/dispatch-cdn.entity";
import { DispatchCdnRepository } from "./dispatch-cdn.repository";

@Injectable()
export class MongoDispatchCdnRepository
  extends MongoTenantScopedRepository<DispatchCdn>
  implements DispatchCdnRepository
{
  constructor(
    @InjectModel("DispatchCdn") model: Model<DispatchCdn>,
    @Optional() session: ClientSession | null = null,
  ) {
    super(model, session);
  }

  withTransaction(context: TransactionContext): MongoDispatchCdnRepository {
    if (!(context instanceof MongoTransactionContext)) {
      throw new Error("MongoDispatchCdnRepository requires a MongoTransactionContext");
    }
    return this.cloneForSession(context.session);
  }

  protected cloneForSession(session: ClientSession): MongoDispatchCdnRepository {
    return new MongoDispatchCdnRepository(this.model, session);
  }

  async saveForCompany(companyId: number, entity: DispatchCdn): Promise<DispatchCdn> {
    if (entity.companyId !== companyId) {
      throw new Error("Dispatch CDN does not belong to the requesting company");
    }
    return this.save(entity);
  }

  async removeForCompany(companyId: number, entity: DispatchCdn): Promise<void> {
    if (entity.companyId !== companyId) {
      throw new Error("Dispatch CDN does not belong to the requesting company");
    }
    await this.remove(entity);
  }

  async findForJobCard(companyId: number, jobCardId: number): Promise<DispatchCdn[]> {
    const docs = await this.documents
      .find({ jobCardId, companyId })
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findOneForCompany(cdnId: number, companyId: number): Promise<DispatchCdn | null> {
    const doc = await this.documents.findOne({ _id: cdnId, companyId }).lean().exec();
    return this.toDomain(doc);
  }

  async updateById(cdnId: number, changes: DeepPartial<DispatchCdn>): Promise<void> {
    await this.documents.findByIdAndUpdate(cdnId, changes as Record<string, unknown>).exec();
  }
}

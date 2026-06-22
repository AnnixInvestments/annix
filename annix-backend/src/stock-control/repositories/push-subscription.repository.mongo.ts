import { Injectable, Optional } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { ClientSession, Model } from "mongoose";
import { MongoTenantScopedRepository } from "../../lib/persistence/mongo-tenant-scoped-repository";
import {
  MongoTransactionContext,
  type TransactionContext,
} from "../../lib/persistence/transaction-context";
import { PushSubscription } from "../entities/push-subscription.entity";
import { PushSubscriptionRepository } from "./push-subscription.repository";

@Injectable()
export class MongoPushSubscriptionRepository
  extends MongoTenantScopedRepository<PushSubscription>
  implements PushSubscriptionRepository
{
  constructor(
    @InjectModel("PushSubscription") model: Model<PushSubscription>,
    @Optional() session: ClientSession | null = null,
  ) {
    super(model, session);
  }

  withTransaction(context: TransactionContext): MongoPushSubscriptionRepository {
    if (!(context instanceof MongoTransactionContext)) {
      throw new Error("MongoPushSubscriptionRepository requires a MongoTransactionContext");
    }
    return this.cloneForSession(context.session);
  }

  protected cloneForSession(session: ClientSession): MongoPushSubscriptionRepository {
    return new MongoPushSubscriptionRepository(this.model, session);
  }

  async saveForCompany(companyId: number, entity: PushSubscription): Promise<PushSubscription> {
    if (entity.companyId !== companyId) {
      throw new Error("Push subscription does not belong to the requesting company");
    }
    return this.save(entity);
  }

  async removeForCompany(companyId: number, entity: PushSubscription): Promise<void> {
    if (entity.companyId !== companyId) {
      throw new Error("Push subscription does not belong to the requesting company");
    }
    await this.remove(entity);
  }

  async findByEndpoint(endpoint: string): Promise<PushSubscription | null> {
    const doc = await this.documents.findOne({ endpoint }).lean().exec();
    return this.toDomain(doc);
  }

  async findForUser(userId: number): Promise<PushSubscription[]> {
    const docs = await this.documents.find({ userId }).lean().exec();
    return this.toDomainList(docs);
  }

  async deleteByUserAndEndpoint(userId: number, endpoint: string): Promise<void> {
    await this.documents.deleteMany({ userId, endpoint }).exec();
  }

  async deleteByIds(ids: number[]): Promise<void> {
    await this.documents.deleteMany({ _id: { $in: ids } }).exec();
  }

  async deleteForCompany(companyId: number): Promise<void> {
    await this.documents.deleteMany({ companyId }).exec();
  }
}

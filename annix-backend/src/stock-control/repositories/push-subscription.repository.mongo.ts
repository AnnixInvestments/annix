import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { PushSubscription } from "../entities/push-subscription.entity";
import { PushSubscriptionRepository } from "./push-subscription.repository";

@Injectable()
export class MongoPushSubscriptionRepository
  extends MongoCrudRepository<PushSubscription>
  implements PushSubscriptionRepository
{
  constructor(@InjectModel("PushSubscription") model: Model<PushSubscription>) {
    super(model);
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

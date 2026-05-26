import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { CvPushSubscription } from "../entities/cv-push-subscription.entity";
import { CvPushSubscriptionRepository } from "./cv-push-subscription.repository";

@Injectable()
export class MongoCvPushSubscriptionRepository
  extends MongoCrudRepository<CvPushSubscription>
  implements CvPushSubscriptionRepository
{
  constructor(@InjectModel("CvPushSubscription") model: Model<CvPushSubscription>) {
    super(model);
  }

  async findByEndpoint(endpoint: string): Promise<CvPushSubscription | null> {
    const doc = await this.documents.findOne({ endpoint }).lean().exec();
    return this.toDomain(doc);
  }

  async findByUser(userId: number): Promise<CvPushSubscription[]> {
    const docs = await this.documents.find({ userId }).lean().exec();
    return this.toDomainList(docs);
  }

  countForUser(userId: number): Promise<number> {
    return this.documents.countDocuments({ userId }).exec();
  }

  async deleteByUserEndpoint(userId: number, endpoint: string): Promise<void> {
    await this.documents.deleteMany({ userId, endpoint }).exec();
  }

  async deleteByIds(ids: number[]): Promise<void> {
    if (ids.length === 0) return;
    await this.documents.deleteMany({ _id: { $in: ids } }).exec();
  }
}

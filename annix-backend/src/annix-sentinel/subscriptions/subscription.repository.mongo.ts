import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { AnnixSentinelSubscription } from "./entities/subscription.entity";
import { AnnixSentinelSubscriptionRepository } from "./subscription.repository";

@Injectable()
export class MongoAnnixSentinelSubscriptionRepository
  extends MongoCrudRepository<AnnixSentinelSubscription>
  implements AnnixSentinelSubscriptionRepository
{
  constructor(@InjectModel("AnnixSentinelSubscription") model: Model<AnnixSentinelSubscription>) {
    super(model);
  }

  async findByCompany(companyId: number): Promise<AnnixSentinelSubscription | null> {
    const document = await this.documents.findOne({ companyId }).lean().exec();
    return this.toDomain(document);
  }

  async findByPaystackCustomerId(
    paystackCustomerId: string,
  ): Promise<AnnixSentinelSubscription | null> {
    const document = await this.documents.findOne({ paystackCustomerId }).lean().exec();
    return this.toDomain(document);
  }
}

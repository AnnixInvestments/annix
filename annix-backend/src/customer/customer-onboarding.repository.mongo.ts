import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../lib/persistence/mongo-crud-repository";
import { CustomerOnboardingRepository } from "./customer-onboarding.repository";
import { CustomerOnboarding } from "./entities/customer-onboarding.entity";

@Injectable()
export class MongoCustomerOnboardingRepository
  extends MongoCrudRepository<CustomerOnboarding>
  implements CustomerOnboardingRepository
{
  constructor(@InjectModel("CustomerOnboarding") model: Model<CustomerOnboarding>) {
    super(model);
  }

  async findByCustomerId(
    customerId: number,
    relations: string[] = [],
  ): Promise<CustomerOnboarding | null> {
    const document = await this.documents.findOne({ customerId }).populate(relations).lean().exec();
    return this.toDomain(document);
  }

  async findPendingReview(statuses: string[]): Promise<CustomerOnboarding[]> {
    const docs = await this.documents
      .find({ status: { $in: statuses } })
      .populate(["customer", "customer.company", "customer.user"])
      .sort({ submittedAt: 1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }
}

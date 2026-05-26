import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../lib/persistence/mongo-crud-repository";
import { CustomerLoginAttemptRepository } from "./customer-login-attempt.repository";
import { CustomerLoginAttempt } from "./entities/customer-login-attempt.entity";

@Injectable()
export class MongoCustomerLoginAttemptRepository
  extends MongoCrudRepository<CustomerLoginAttempt>
  implements CustomerLoginAttemptRepository
{
  constructor(@InjectModel("CustomerLoginAttempt") model: Model<CustomerLoginAttempt>) {
    super(model);
  }

  countRecentFailures(email: string, since: Date): Promise<number> {
    return this.documents
      .countDocuments({
        email,
        success: false,
        attemptTime: { $gte: since },
      })
      .exec();
  }

  async recentByProfile(customerProfileId: number, limit: number): Promise<CustomerLoginAttempt[]> {
    const docs = await this.documents
      .find({ customerProfileId })
      .sort({ attemptTime: -1 })
      .limit(limit)
      .lean()
      .exec();
    return this.toDomainList(docs);
  }
}

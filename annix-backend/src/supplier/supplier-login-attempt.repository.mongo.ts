import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../lib/persistence/mongo-crud-repository";
import { SupplierLoginAttempt } from "./entities/supplier-login-attempt.entity";
import { SupplierLoginAttemptRepository } from "./supplier-login-attempt.repository";

@Injectable()
export class MongoSupplierLoginAttemptRepository
  extends MongoCrudRepository<SupplierLoginAttempt>
  implements SupplierLoginAttemptRepository
{
  constructor(@InjectModel("SupplierLoginAttempt") model: Model<SupplierLoginAttempt>) {
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
}

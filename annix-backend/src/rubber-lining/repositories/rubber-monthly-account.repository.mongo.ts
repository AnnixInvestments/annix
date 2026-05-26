import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import type { DeepPartial } from "../../lib/persistence/crud-repository";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { RubberMonthlyAccount } from "../entities/rubber-monthly-account.entity";
import {
  type MonthlyAccountFilters,
  RubberMonthlyAccountRepository,
} from "./rubber-monthly-account.repository";

@Injectable()
export class MongoRubberMonthlyAccountRepository
  extends MongoCrudRepository<RubberMonthlyAccount>
  implements RubberMonthlyAccountRepository
{
  constructor(@InjectModel("RubberMonthlyAccount") model: Model<RubberMonthlyAccount>) {
    super(model);
  }

  build(data: Partial<RubberMonthlyAccount>): RubberMonthlyAccount {
    return data as RubberMonthlyAccount;
  }

  async findFilteredOrdered(filters?: MonthlyAccountFilters): Promise<RubberMonthlyAccount[]> {
    const filter: Record<string, unknown> = {};
    if (filters?.accountType) {
      filter.accountType = filters.accountType;
    }
    if (filters?.status) {
      filter.status = filters.status;
    }
    if (filters?.year) {
      filter.periodYear = filters.year;
    }
    const docs = await this.documents
      .find(filter)
      .sort({ periodYear: -1, periodMonth: -1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async updateById(id: number, updates: DeepPartial<RubberMonthlyAccount>): Promise<void> {
    await this.documents.updateOne({ _id: id }, { $set: updates }).exec();
  }
}

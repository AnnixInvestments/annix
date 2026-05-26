import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../lib/persistence/mongo-crud-repository";
import { GoalPeriod, SalesGoal } from "./entities/sales-goal.entity";
import { SalesGoalRepository } from "./sales-goal.repository";

@Injectable()
export class MongoSalesGoalRepository
  extends MongoCrudRepository<SalesGoal>
  implements SalesGoalRepository
{
  constructor(@InjectModel("SalesGoal") model: Model<SalesGoal>) {
    super(model);
  }

  async findByUser(userId: number): Promise<SalesGoal[]> {
    const docs = await this.documents.find({ userId }).sort({ period: 1 }).lean().exec();
    return this.toDomainList(docs);
  }

  async findByUserAndPeriod(userId: number, period: GoalPeriod): Promise<SalesGoal | null> {
    const doc = await this.documents.findOne({ userId, period }).lean().exec();
    return this.toDomain(doc);
  }

  async deleteByUserAndPeriod(userId: number, period: GoalPeriod): Promise<number> {
    const result = await this.documents.deleteMany({ userId, period }).exec();
    return result.deletedCount ?? 0;
  }
}

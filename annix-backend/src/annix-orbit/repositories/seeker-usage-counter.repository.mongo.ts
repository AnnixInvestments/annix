import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { ORBIT_CONNECTION } from "../../lib/persistence/mongo-connections";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { SeekerUsageCounter } from "../entities/seeker-usage-counter.entity";
import { SeekerUsageCounterRepository } from "./seeker-usage-counter.repository";

@Injectable()
export class MongoSeekerUsageCounterRepository
  extends MongoCrudRepository<SeekerUsageCounter>
  implements SeekerUsageCounterRepository
{
  constructor(
    @InjectModel("SeekerUsageCounter", ORBIT_CONNECTION) model: Model<SeekerUsageCounter>,
  ) {
    super(model);
  }

  async getCount(subjectId: string, operation: string, monthKey: string): Promise<number> {
    const doc = await this.documents.findOne({ subjectId, operation, monthKey }).lean().exec();
    return doc ? Number(doc.count) : 0;
  }

  async increment(subjectId: string, operation: string, monthKey: string): Promise<void> {
    const updated = await this.documents
      .findOneAndUpdate({ subjectId, operation, monthKey }, { $inc: { count: 1 } }, { new: true })
      .lean()
      .exec();
    if (updated) {
      return;
    }
    try {
      await this.create({ subjectId, operation, monthKey, count: 1 });
    } catch {
      await this.documents
        .updateOne({ subjectId, operation, monthKey }, { $inc: { count: 1 } })
        .exec();
    }
  }
}

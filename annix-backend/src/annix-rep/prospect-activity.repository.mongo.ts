import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../lib/persistence/mongo-crud-repository";
import { ProspectActivity, ProspectActivityType } from "./entities/prospect-activity.entity";
import { ProspectActivityRepository } from "./prospect-activity.repository";

@Injectable()
export class MongoProspectActivityRepository
  extends MongoCrudRepository<ProspectActivity>
  implements ProspectActivityRepository
{
  constructor(@InjectModel("ProspectActivity") model: Model<ProspectActivity>) {
    super(model);
  }

  async findByProspect(prospectId: number, limit: number): Promise<ProspectActivity[]> {
    const docs = await this.documents
      .find({ prospectId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate("user")
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findByProspectAndType(
    prospectId: number,
    activityType: ProspectActivityType,
  ): Promise<ProspectActivity[]> {
    const docs = await this.documents
      .find({ prospectId, activityType })
      .populate("user")
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findStatusChangesInRange(
    userId: number,
    from: Date,
    to: Date,
  ): Promise<ProspectActivity[]> {
    const docs = await this.documents
      .find({
        userId,
        activityType: ProspectActivityType.STATUS_CHANGE,
        createdAt: { $gte: from, $lte: to },
      })
      .populate("prospect")
      .lean()
      .exec();
    return this.toDomainList(docs);
  }
}

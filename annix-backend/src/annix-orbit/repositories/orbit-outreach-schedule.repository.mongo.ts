import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { ORBIT_CONNECTION } from "../../lib/persistence/mongo-connections";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { OrbitOutreachSchedule } from "../entities/orbit-outreach-schedule.entity";
import { OrbitOutreachScheduleRepository } from "./orbit-outreach-schedule.repository";

@Injectable()
export class MongoOrbitOutreachScheduleRepository
  extends MongoCrudRepository<OrbitOutreachSchedule>
  implements OrbitOutreachScheduleRepository
{
  constructor(
    @InjectModel("OrbitOutreachSchedule", ORBIT_CONNECTION) model: Model<OrbitOutreachSchedule>,
  ) {
    super(model);
  }

  async listNewestFirst(): Promise<OrbitOutreachSchedule[]> {
    const docs = await this.documents.find().sort({ scheduledAt: -1 }).lean().exec();
    return this.toDomainList(docs);
  }

  async listDuePending(cutoff: Date): Promise<OrbitOutreachSchedule[]> {
    const docs = await this.documents
      .find({ status: "pending", scheduledAt: { $lte: cutoff } })
      .sort({ scheduledAt: 1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }
}

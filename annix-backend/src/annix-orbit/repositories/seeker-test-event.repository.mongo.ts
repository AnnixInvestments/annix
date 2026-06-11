import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { ORBIT_CONNECTION } from "../../lib/persistence/mongo-connections";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { SeekerTestEvent } from "../entities/seeker-test-event.entity";
import { SeekerTestEventRepository } from "./seeker-test-event.repository";

@Injectable()
export class MongoSeekerTestEventRepository
  extends MongoCrudRepository<SeekerTestEvent>
  implements SeekerTestEventRepository
{
  constructor(@InjectModel("SeekerTestEvent", ORBIT_CONNECTION) model: Model<SeekerTestEvent>) {
    super(model);
  }

  async recentFailures(limit: number): Promise<SeekerTestEvent[]> {
    const docs = await this.documents
      .find({ ok: false })
      .sort({ ts: -1 })
      .limit(limit)
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async eventsSince(since: Date): Promise<SeekerTestEvent[]> {
    const docs = await this.documents
      .find({ ts: { $gte: since } })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async countByEventNameSince(eventName: string, since: Date): Promise<number> {
    return this.documents.countDocuments({ eventName, ts: { $gte: since } }).exec();
  }
}

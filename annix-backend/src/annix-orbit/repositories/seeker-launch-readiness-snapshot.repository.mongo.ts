import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { ORBIT_CONNECTION } from "../../lib/persistence/mongo-connections";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { SeekerLaunchReadinessSnapshot } from "../entities/seeker-launch-readiness-snapshot.entity";
import { SeekerLaunchReadinessSnapshotRepository } from "./seeker-launch-readiness-snapshot.repository";

@Injectable()
export class MongoSeekerLaunchReadinessSnapshotRepository
  extends MongoCrudRepository<SeekerLaunchReadinessSnapshot>
  implements SeekerLaunchReadinessSnapshotRepository
{
  constructor(
    @InjectModel("SeekerLaunchReadinessSnapshot", ORBIT_CONNECTION)
    model: Model<SeekerLaunchReadinessSnapshot>,
  ) {
    super(model);
  }

  async listNewestFirst(limit: number): Promise<SeekerLaunchReadinessSnapshot[]> {
    const docs = await this.documents.find().sort({ createdAt: -1 }).limit(limit).lean().exec();
    return this.toDomainList(docs);
  }

  async latest(): Promise<SeekerLaunchReadinessSnapshot | null> {
    const doc = await this.documents.findOne().sort({ createdAt: -1 }).lean().exec();
    return this.toDomain(doc);
  }

  async findByDate(snapshotDate: string): Promise<SeekerLaunchReadinessSnapshot | null> {
    const doc = await this.documents.findOne({ snapshotDate }).lean().exec();
    return this.toDomain(doc);
  }
}

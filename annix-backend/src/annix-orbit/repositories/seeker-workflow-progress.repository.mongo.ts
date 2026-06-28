import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { ORBIT_CONNECTION } from "../../lib/persistence/mongo-connections";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { SeekerWorkflowProgress } from "../entities/seeker-workflow-progress.entity";
import { SeekerWorkflowProgressRepository } from "./seeker-workflow-progress.repository";

@Injectable()
export class MongoSeekerWorkflowProgressRepository
  extends MongoCrudRepository<SeekerWorkflowProgress>
  implements SeekerWorkflowProgressRepository
{
  constructor(
    @InjectModel("SeekerWorkflowProgress", ORBIT_CONNECTION) model: Model<SeekerWorkflowProgress>,
  ) {
    super(model);
  }

  async findByParticipant(participantId: string): Promise<SeekerWorkflowProgress | null> {
    const doc = await this.documents.findOne({ participantId }).lean().exec();
    return this.toDomain(doc);
  }

  async listAll(): Promise<SeekerWorkflowProgress[]> {
    const docs = await this.documents.find().sort({ createdAt: -1 }).lean().exec();
    return this.toDomainList(docs);
  }

  async avgTimeToFirstValueSeconds(): Promise<number | null> {
    const rows = await this.documents
      .aggregate<{ avg: number }>([
        { $match: { timeToFirstValueSeconds: { $ne: null } } },
        { $group: { _id: null, avg: { $avg: "$timeToFirstValueSeconds" } } },
      ])
      .exec();
    return rows.length > 0 ? Math.round(rows[0].avg) : null;
  }
}

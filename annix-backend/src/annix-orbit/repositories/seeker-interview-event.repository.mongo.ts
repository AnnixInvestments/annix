import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { ORBIT_CONNECTION } from "../../lib/persistence/mongo-connections";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { SeekerInterviewEvent } from "../entities/seeker-interview-event.entity";
import { SeekerInterviewEventRepository } from "./seeker-interview-event.repository";

@Injectable()
export class MongoSeekerInterviewEventRepository
  extends MongoCrudRepository<SeekerInterviewEvent>
  implements SeekerInterviewEventRepository
{
  constructor(
    @InjectModel("SeekerInterviewEvent", ORBIT_CONNECTION) model: Model<SeekerInterviewEvent>,
  ) {
    super(model);
  }

  async listForCandidates(candidateIds: number[]): Promise<SeekerInterviewEvent[]> {
    if (candidateIds.length === 0) return [];
    const docs = await this.documents
      .find({ candidateId: { $in: candidateIds } })
      .sort({ startsAt: 1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async startingBetween(from: Date, to: Date): Promise<SeekerInterviewEvent[]> {
    const docs = await this.documents
      .find({ startsAt: { $gt: from, $lte: to } })
      .sort({ startsAt: 1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }
}

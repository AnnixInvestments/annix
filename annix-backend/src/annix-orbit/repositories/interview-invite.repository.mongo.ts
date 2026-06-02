import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { ORBIT_CONNECTION } from "../../lib/persistence/mongo-connections";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { InterviewInvite } from "../entities/interview-invite.entity";
import { InterviewInviteRepository } from "./interview-invite.repository";

@Injectable()
export class MongoInterviewInviteRepository
  extends MongoCrudRepository<InterviewInvite>
  implements InterviewInviteRepository
{
  constructor(@InjectModel("InterviewInvite", ORBIT_CONNECTION) model: Model<InterviewInvite>) {
    super(model);
  }

  async findByToken(token: string): Promise<InterviewInvite | null> {
    const doc = await this.documents.findOne({ token }).lean().exec();
    return this.toDomain(doc);
  }

  async findForCandidatesWithJob(candidateIds: number[]): Promise<InterviewInvite[]> {
    if (candidateIds.length === 0) return [];
    const docs = await this.documents
      .find({ candidateId: { $in: candidateIds } })
      .sort({ createdAt: -1 })
      .populate("jobPosting")
      .lean()
      .exec();
    return this.toDomainList(docs);
  }
}

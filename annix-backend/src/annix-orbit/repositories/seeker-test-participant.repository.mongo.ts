import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { ORBIT_CONNECTION } from "../../lib/persistence/mongo-connections";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { SeekerTestParticipant } from "../entities/seeker-test-participant.entity";
import { SeekerTestParticipantRepository } from "./seeker-test-participant.repository";

@Injectable()
export class MongoSeekerTestParticipantRepository
  extends MongoCrudRepository<SeekerTestParticipant>
  implements SeekerTestParticipantRepository
{
  constructor(
    @InjectModel("SeekerTestParticipant", ORBIT_CONNECTION) model: Model<SeekerTestParticipant>,
  ) {
    super(model);
  }

  async findByCandidateAndPhase(
    candidateId: number,
    phaseId: string,
  ): Promise<SeekerTestParticipant | null> {
    const doc = await this.documents.findOne({ candidateId, phaseId }).lean().exec();
    return this.toDomain(doc);
  }

  async listByPhase(phaseId: string): Promise<SeekerTestParticipant[]> {
    const docs = await this.documents.find({ phaseId }).lean().exec();
    return this.toDomainList(docs);
  }

  async countByPhase(phaseId: string): Promise<number> {
    return this.documents.countDocuments({ phaseId }).exec();
  }
}

import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { ORBIT_CONNECTION } from "../../lib/persistence/mongo-connections";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { SeekerTestPhase } from "../entities/seeker-test-phase.entity";
import { SeekerTestPhaseRepository } from "./seeker-test-phase.repository";

@Injectable()
export class MongoSeekerTestPhaseRepository
  extends MongoCrudRepository<SeekerTestPhase>
  implements SeekerTestPhaseRepository
{
  constructor(@InjectModel("SeekerTestPhase", ORBIT_CONNECTION) model: Model<SeekerTestPhase>) {
    super(model);
  }

  async listNewestFirst(): Promise<SeekerTestPhase[]> {
    const docs = await this.documents.find().sort({ createdAt: -1 }).lean().exec();
    return this.toDomainList(docs);
  }

  async findByStatus(status: string): Promise<SeekerTestPhase[]> {
    const docs = await this.documents.find({ status }).lean().exec();
    return this.toDomainList(docs);
  }
}

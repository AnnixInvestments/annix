import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { ORBIT_CONNECTION } from "../../lib/persistence/mongo-connections";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { SeekerEmploymentRecord } from "../entities/seeker-employment-record.entity";
import { SeekerEmploymentRecordRepository } from "./seeker-employment-record.repository";

@Injectable()
export class MongoSeekerEmploymentRecordRepository
  extends MongoCrudRepository<SeekerEmploymentRecord>
  implements SeekerEmploymentRecordRepository
{
  constructor(
    @InjectModel("SeekerEmploymentRecord", ORBIT_CONNECTION) model: Model<SeekerEmploymentRecord>,
  ) {
    super(model);
  }

  async listForCandidates(candidateIds: number[]): Promise<SeekerEmploymentRecord[]> {
    if (candidateIds.length === 0) return [];
    const docs = await this.documents
      .find({ candidateId: { $in: candidateIds } })
      .sort({ startDate: -1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }
}

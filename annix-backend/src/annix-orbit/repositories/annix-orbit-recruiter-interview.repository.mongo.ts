import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { AnnixOrbitRecruiterInterview } from "../entities/annix-orbit-recruiter-interview.entity";
import { AnnixOrbitRecruiterInterviewRepository } from "./annix-orbit-recruiter-interview.repository";

@Injectable()
export class MongoAnnixOrbitRecruiterInterviewRepository
  extends MongoCrudRepository<AnnixOrbitRecruiterInterview>
  implements AnnixOrbitRecruiterInterviewRepository
{
  constructor(
    @InjectModel("AnnixOrbitRecruiterInterview") model: Model<AnnixOrbitRecruiterInterview>,
  ) {
    super(model);
  }

  async findByCompany(companyId: number): Promise<AnnixOrbitRecruiterInterview[]> {
    const docs = await this.documents.find({ companyId }).sort({ scheduledAt: 1 }).lean().exec();
    return this.toDomainList(docs);
  }

  async findByIdForCompany(
    id: number,
    companyId: number,
  ): Promise<AnnixOrbitRecruiterInterview | null> {
    const doc = await this.documents.findOne({ _id: id, companyId }).lean().exec();
    return this.toDomain(doc);
  }
}

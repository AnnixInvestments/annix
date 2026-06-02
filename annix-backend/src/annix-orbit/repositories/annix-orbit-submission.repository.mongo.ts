import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { ORBIT_CONNECTION } from "../../lib/persistence/mongo-connections";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { AnnixOrbitSubmission } from "../entities/annix-orbit-submission.entity";
import { AnnixOrbitSubmissionRepository } from "./annix-orbit-submission.repository";

@Injectable()
export class MongoAnnixOrbitSubmissionRepository
  extends MongoCrudRepository<AnnixOrbitSubmission>
  implements AnnixOrbitSubmissionRepository
{
  constructor(
    @InjectModel("AnnixOrbitSubmission", ORBIT_CONNECTION) model: Model<AnnixOrbitSubmission>,
  ) {
    super(model);
  }

  async findByCompany(companyId: number): Promise<AnnixOrbitSubmission[]> {
    const docs = await this.documents.find({ companyId }).sort({ createdAt: -1 }).lean().exec();
    return this.toDomainList(docs);
  }

  async findByIdForCompany(id: number, companyId: number): Promise<AnnixOrbitSubmission | null> {
    const doc = await this.documents.findOne({ _id: id, companyId }).lean().exec();
    return this.toDomain(doc);
  }
}

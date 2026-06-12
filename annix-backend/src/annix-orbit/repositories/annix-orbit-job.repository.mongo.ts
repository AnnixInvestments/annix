import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { AnnixOrbitJob } from "../entities/annix-orbit-job.entity";
import { AnnixOrbitJobRepository } from "./annix-orbit-job.repository";

@Injectable()
export class MongoAnnixOrbitJobRepository
  extends MongoCrudRepository<AnnixOrbitJob>
  implements AnnixOrbitJobRepository
{
  constructor(@InjectModel("AnnixOrbitJob") model: Model<AnnixOrbitJob>) {
    super(model);
  }

  async findByCompany(companyId: number): Promise<AnnixOrbitJob[]> {
    const docs = await this.documents.find({ companyId }).sort({ createdAt: -1 }).lean().exec();
    return this.toDomainList(docs);
  }

  async findByIdForCompany(id: number, companyId: number): Promise<AnnixOrbitJob | null> {
    const doc = await this.documents.findOne({ _id: id, companyId }).lean().exec();
    return this.toDomain(doc);
  }
}

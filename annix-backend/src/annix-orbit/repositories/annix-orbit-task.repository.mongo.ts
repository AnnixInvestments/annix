import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { ORBIT_CONNECTION } from "../../lib/persistence/mongo-connections";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { AnnixOrbitTask } from "../entities/annix-orbit-task.entity";
import { AnnixOrbitTaskRepository } from "./annix-orbit-task.repository";

@Injectable()
export class MongoAnnixOrbitTaskRepository
  extends MongoCrudRepository<AnnixOrbitTask>
  implements AnnixOrbitTaskRepository
{
  constructor(@InjectModel("AnnixOrbitTask", ORBIT_CONNECTION) model: Model<AnnixOrbitTask>) {
    super(model);
  }

  async findByCompany(companyId: number): Promise<AnnixOrbitTask[]> {
    const docs = await this.documents
      .find({ companyId })
      .sort({ done: 1, dueDate: 1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findByIdForCompany(id: number, companyId: number): Promise<AnnixOrbitTask | null> {
    const doc = await this.documents.findOne({ _id: id, companyId }).lean().exec();
    return doc ? this.toDomain(doc) : null;
  }

  async deleteById(id: number): Promise<void> {
    await this.documents.findByIdAndDelete(id).exec();
  }
}

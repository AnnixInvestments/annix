import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { ORBIT_CONNECTION } from "../../lib/persistence/mongo-connections";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { OrbitDismissReason } from "../entities/orbit-dismiss-reason.entity";
import { OrbitDismissReasonRepository } from "./orbit-dismiss-reason.repository";

@Injectable()
export class MongoOrbitDismissReasonRepository
  extends MongoCrudRepository<OrbitDismissReason>
  implements OrbitDismissReasonRepository
{
  constructor(
    @InjectModel("OrbitDismissReason", ORBIT_CONNECTION) model: Model<OrbitDismissReason>,
  ) {
    super(model);
  }

  async listAllSorted(): Promise<OrbitDismissReason[]> {
    const docs = await this.documents.find().sort({ sortOrder: 1, label: 1 }).lean().exec();
    return this.toDomainList(docs);
  }

  async listActiveSorted(): Promise<OrbitDismissReason[]> {
    const docs = await this.documents
      .find({ active: true })
      .sort({ sortOrder: 1, label: 1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findByCode(code: string): Promise<OrbitDismissReason | null> {
    const doc = await this.documents.findOne({ code }).lean().exec();
    return this.toDomain(doc);
  }

  async deleteById(id: number): Promise<void> {
    await this.documents.findByIdAndDelete(id).exec();
  }
}

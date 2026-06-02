import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { ORBIT_CONNECTION } from "../../lib/persistence/mongo-connections";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { OrbitCredentialType } from "../entities/orbit-credential-type.entity";
import { OrbitCredentialTypeRepository } from "./orbit-credential-type.repository";

@Injectable()
export class MongoOrbitCredentialTypeRepository
  extends MongoCrudRepository<OrbitCredentialType>
  implements OrbitCredentialTypeRepository
{
  constructor(
    @InjectModel("OrbitCredentialType", ORBIT_CONNECTION) model: Model<OrbitCredentialType>,
  ) {
    super(model);
  }

  async listAllSorted(): Promise<OrbitCredentialType[]> {
    const docs = await this.documents.find().sort({ sortOrder: 1, label: 1 }).lean().exec();
    return this.toDomainList(docs);
  }

  async listActiveSorted(): Promise<OrbitCredentialType[]> {
    const docs = await this.documents
      .find({ active: true })
      .sort({ sortOrder: 1, label: 1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findByCode(code: string): Promise<OrbitCredentialType | null> {
    const doc = await this.documents.findOne({ code }).lean().exec();
    return this.toDomain(doc);
  }

  async deleteById(id: number): Promise<void> {
    await this.documents.findByIdAndDelete(id).exec();
  }
}

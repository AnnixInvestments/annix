import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { ORBIT_CONNECTION } from "../../lib/persistence/mongo-connections";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { OrbitOutreachAsset } from "../entities/orbit-outreach-asset.entity";
import { OrbitOutreachAssetRepository } from "./orbit-outreach-asset.repository";

@Injectable()
export class MongoOrbitOutreachAssetRepository
  extends MongoCrudRepository<OrbitOutreachAsset>
  implements OrbitOutreachAssetRepository
{
  constructor(
    @InjectModel("OrbitOutreachAsset", ORBIT_CONNECTION) model: Model<OrbitOutreachAsset>,
  ) {
    super(model);
  }

  async findBySlot(slot: string): Promise<OrbitOutreachAsset | null> {
    const doc = await this.documents.findOne({ slot }).lean().exec();
    return this.toDomain(doc);
  }

  async listAll(): Promise<OrbitOutreachAsset[]> {
    const docs = await this.documents.find().sort({ createdAt: 1 }).lean().exec();
    return this.toDomainList(docs);
  }
}

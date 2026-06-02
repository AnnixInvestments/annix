import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { ORBIT_CONNECTION } from "../../lib/persistence/mongo-connections";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { OrbitTierCapability } from "../entities/orbit-tier-capability.entity";
import { OrbitTierCapabilityRepository } from "./orbit-tier-capability.repository";

@Injectable()
export class MongoOrbitTierCapabilityRepository
  extends MongoCrudRepository<OrbitTierCapability>
  implements OrbitTierCapabilityRepository
{
  constructor(
    @InjectModel("OrbitTierCapability", ORBIT_CONNECTION) model: Model<OrbitTierCapability>,
  ) {
    super(model);
  }

  async findAllOrdered(): Promise<OrbitTierCapability[]> {
    const docs = await this.documents.find().sort({ displayOrder: 1, tier: 1 }).lean().exec();
    return this.toDomainList(docs);
  }

  async findByTier(tier: string): Promise<OrbitTierCapability | null> {
    const doc = await this.documents.findOne({ tier }).lean().exec();
    return this.toDomain(doc);
  }
}

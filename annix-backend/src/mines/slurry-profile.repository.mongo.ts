import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../lib/persistence/mongo-crud-repository";
import { SlurryProfile } from "./entities/slurry-profile.entity";
import { SlurryProfileRepository } from "./slurry-profile.repository";

@Injectable()
export class MongoSlurryProfileRepository
  extends MongoCrudRepository<SlurryProfile>
  implements SlurryProfileRepository
{
  constructor(@InjectModel("SlurryProfile") model: Model<SlurryProfile>) {
    super(model);
  }

  async findByCommodityWithRelation(commodityId: number): Promise<SlurryProfile | null> {
    const document = await this.documents.findOne({ commodityId }).lean().exec();
    return this.toDomain(document);
  }

  async findAllWithCommodity(): Promise<SlurryProfile[]> {
    const documents = await this.documents.find().sort({ commodityId: 1 }).lean().exec();
    return this.toDomainList(documents);
  }
}

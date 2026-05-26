import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../lib/persistence/mongo-crud-repository";
import { CommodityRepository } from "./commodity.repository";
import { Commodity } from "./entities/commodity.entity";

@Injectable()
export class MongoCommodityRepository
  extends MongoCrudRepository<Commodity>
  implements CommodityRepository
{
  constructor(@InjectModel("Commodity") model: Model<Commodity>) {
    super(model);
  }

  async findAllOrdered(): Promise<Commodity[]> {
    const documents = await this.documents.find().sort({ commodityName: 1 }).lean().exec();
    return this.toDomainList(documents);
  }

  async findByIdWithRelations(id: number): Promise<Commodity | null> {
    const document = await this.documents.findOne({ id }).lean().exec();
    return this.toDomain(document);
  }
}

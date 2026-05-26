import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../lib/persistence/mongo-crud-repository";
import { HdpeStubPrice } from "./entities/hdpe-stub-price.entity";
import { HdpeStubPriceRepository } from "./hdpe-stub-price.repository";

@Injectable()
export class MongoHdpeStubPriceRepository
  extends MongoCrudRepository<HdpeStubPrice>
  implements HdpeStubPriceRepository
{
  constructor(@InjectModel("HdpeStubPrice") model: Model<HdpeStubPrice>) {
    super(model);
  }

  async findByNominalBore(nominalBore: number): Promise<HdpeStubPrice | null> {
    const document = await this.documents.findOne({ nominalBore, isActive: true }).lean().exec();
    return this.toDomain(document);
  }
}

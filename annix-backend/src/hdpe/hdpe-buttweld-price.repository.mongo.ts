import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../lib/persistence/mongo-crud-repository";
import { HdpeButtweldPrice } from "./entities/hdpe-buttweld-price.entity";
import { HdpeButtweldPriceRepository } from "./hdpe-buttweld-price.repository";

@Injectable()
export class MongoHdpeButtweldPriceRepository
  extends MongoCrudRepository<HdpeButtweldPrice>
  implements HdpeButtweldPriceRepository
{
  constructor(@InjectModel("HdpeButtweldPrice") model: Model<HdpeButtweldPrice>) {
    super(model);
  }

  async findByNominalBore(nominalBore: number): Promise<HdpeButtweldPrice | null> {
    const document = await this.documents.findOne({ nominalBore, isActive: true }).lean().exec();
    return this.toDomain(document);
  }
}

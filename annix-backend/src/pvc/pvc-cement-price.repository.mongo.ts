import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../lib/persistence/mongo-crud-repository";
import { PvcCementPrice } from "./entities/pvc-cement-price.entity";
import { PvcCementPriceRepository } from "./pvc-cement-price.repository";

@Injectable()
export class MongoPvcCementPriceRepository
  extends MongoCrudRepository<PvcCementPrice>
  implements PvcCementPriceRepository
{
  constructor(@InjectModel("PvcCementPrice") model: Model<PvcCementPrice>) {
    super(model);
  }

  async findActiveByDN(nominalDiameter: number): Promise<PvcCementPrice | null> {
    const document = await this.documents
      .findOne({ nominalDiameter, isActive: true })
      .lean()
      .exec();
    return this.toDomain(document);
  }
}

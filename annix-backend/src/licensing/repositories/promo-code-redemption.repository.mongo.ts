import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { PromoCodeRedemption } from "../entities/promo-code-redemption.entity";
import { PromoCodeRedemptionRepository } from "./promo-code-redemption.repository";

@Injectable()
export class MongoPromoCodeRedemptionRepository
  extends MongoCrudRepository<PromoCodeRedemption>
  implements PromoCodeRedemptionRepository
{
  constructor(@InjectModel("PromoCodeRedemption") model: Model<PromoCodeRedemption>) {
    super(model);
  }

  async forPromoCode(promoCodeId: number): Promise<PromoCodeRedemption[]> {
    const docs = await this.documents.find({ promoCodeId }).sort({ redeemedAt: -1 }).lean().exec();
    return this.toDomainList(docs);
  }

  async findByPromoAndCompany(
    promoCodeId: number,
    companyId: number,
  ): Promise<PromoCodeRedemption | null> {
    const doc = await this.documents.findOne({ promoCodeId, companyId }).lean().exec();
    return this.toDomain(doc);
  }
}

import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { PromoCode } from "../entities/promo-code.entity";
import { PromoCodeRepository } from "./promo-code.repository";

@Injectable()
export class MongoPromoCodeRepository
  extends MongoCrudRepository<PromoCode>
  implements PromoCodeRepository
{
  constructor(@InjectModel("PromoCode") model: Model<PromoCode>) {
    super(model);
  }

  async allOrderedByCreatedAt(): Promise<PromoCode[]> {
    const docs = await this.documents.find().sort({ createdAt: -1 }).lean().exec();
    return this.toDomainList(docs);
  }

  async findByCode(code: string): Promise<PromoCode | null> {
    const doc = await this.documents.findOne({ code }).lean().exec();
    return this.toDomain(doc);
  }

  async deleteById(id: number): Promise<number> {
    const result = await this.documents.deleteOne({ _id: id }).exec();
    return result.deletedCount ?? 0;
  }

  async incrementRedemptionWhenAvailable(promoCodeId: number): Promise<number> {
    const updated = await this.documents
      .findOneAndUpdate(
        {
          _id: promoCodeId,
          $or: [
            { maxRedemptions: null },
            { $expr: { $lt: ["$timesRedeemed", "$maxRedemptions"] } },
          ],
        },
        { $inc: { timesRedeemed: 1 } },
        { new: true },
      )
      .lean()
      .exec();
    return updated ? 1 : 0;
  }
}

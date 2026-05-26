import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { RubberAuCocItem } from "../entities/rubber-au-coc-item.entity";
import { RubberAuCocItemRepository } from "./rubber-au-coc-item.repository";

@Injectable()
export class MongoRubberAuCocItemRepository
  extends MongoCrudRepository<RubberAuCocItem>
  implements RubberAuCocItemRepository
{
  constructor(@InjectModel("RubberAuCocItem") model: Model<RubberAuCocItem>) {
    super(model);
  }

  build(data: Partial<RubberAuCocItem>): RubberAuCocItem {
    return data as RubberAuCocItem;
  }

  saveMany(entities: RubberAuCocItem[]): Promise<RubberAuCocItem[]> {
    return Promise.all(entities.map((entity) => this.create(entity)));
  }

  async findByAuCocIdWithRolls(auCocId: number): Promise<RubberAuCocItem[]> {
    const docs = await this.documents
      .find({ auCocId })
      .populate({ path: "rollStock", populate: { path: "compoundCoding" } })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async deleteByAuCocId(auCocId: number): Promise<void> {
    await this.documents.deleteMany({ auCocId }).exec();
  }
}

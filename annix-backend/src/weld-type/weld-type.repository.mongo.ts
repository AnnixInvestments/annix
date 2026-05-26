import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../lib/persistence/mongo-crud-repository";
import { WeldType } from "./entities/weld-type.entity";
import { WeldTypeRepository } from "./weld-type.repository";

@Injectable()
export class MongoWeldTypeRepository
  extends MongoCrudRepository<WeldType>
  implements WeldTypeRepository
{
  constructor(@InjectModel("WeldType") model: Model<WeldType>) {
    super(model);
  }

  async findByCode(weld_code: string): Promise<WeldType | null> {
    const document = await this.documents.findOne({ weld_code }).lean().exec();
    return this.toDomain(document);
  }
}

import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../lib/persistence/mongo-crud-repository";
import { FlangeType } from "./entities/flange-type.entity";
import { FlangeTypeRepository } from "./flange-type.repository";

@Injectable()
export class MongoFlangeTypeRepository
  extends MongoCrudRepository<FlangeType>
  implements FlangeTypeRepository
{
  constructor(@InjectModel("FlangeType") model: Model<FlangeType>) {
    super(model);
  }

  async findAllOrdered(): Promise<FlangeType[]> {
    return this.toDomainList(await this.documents.find().sort({ code: 1 }).lean().exec());
  }

  async findByCode(code: string): Promise<FlangeType | null> {
    return this.toDomain(await this.documents.findOne({ code }).lean().exec());
  }

  async findByAbbreviation(abbreviation: string): Promise<FlangeType | null> {
    return this.toDomain(await this.documents.findOne({ abbreviation }).lean().exec());
  }
}

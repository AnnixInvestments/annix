import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { RubberType } from "../entities/rubber-type.entity";
import { RubberTypeRepository } from "./rubber-type.repository";

@Injectable()
export class MongoRubberTypeRepository
  extends MongoCrudRepository<RubberType>
  implements RubberTypeRepository
{
  constructor(@InjectModel("RubberType") model: Model<RubberType>) {
    super(model);
  }

  build(data: Partial<RubberType>): RubberType {
    return data as RubberType;
  }

  async findAllOrderedByTypeNumber(): Promise<RubberType[]> {
    const docs = await this.documents.find().sort({ typeNumber: 1 }).lean().exec();
    return this.toDomainList(docs);
  }

  async findOneByTypeNumber(typeNumber: number): Promise<RubberType | null> {
    const doc = await this.documents.findOne({ typeNumber }).lean().exec();
    return this.toDomain(doc);
  }
}

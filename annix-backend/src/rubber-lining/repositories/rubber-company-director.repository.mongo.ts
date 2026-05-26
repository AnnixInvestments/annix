import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { RubberCompanyDirector } from "../entities/rubber-company-director.entity";
import { RubberCompanyDirectorRepository } from "./rubber-company-director.repository";

@Injectable()
export class MongoRubberCompanyDirectorRepository
  extends MongoCrudRepository<RubberCompanyDirector>
  implements RubberCompanyDirectorRepository
{
  constructor(@InjectModel("RubberCompanyDirector") model: Model<RubberCompanyDirector>) {
    super(model);
  }

  async findAllOrderedByName(): Promise<RubberCompanyDirector[]> {
    const docs = await this.documents.find().sort({ name: 1 }).lean().exec();
    return this.toDomainList(docs);
  }

  async findActiveOrderedByName(): Promise<RubberCompanyDirector[]> {
    const docs = await this.documents.find({ isActive: true }).sort({ name: 1 }).lean().exec();
    return this.toDomainList(docs);
  }

  build(data: Partial<RubberCompanyDirector>): RubberCompanyDirector {
    return data as RubberCompanyDirector;
  }

  async deleteById(id: number): Promise<boolean> {
    const result = await this.documents.deleteOne({ _id: id }).exec();
    return result.deletedCount > 0;
  }
}

import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../lib/persistence/mongo-crud-repository";
import { PipeSteelWorkConfigEntity } from "./entities/pipe-steel-work-config.entity";
import { PipeSteelWorkConfigRepository } from "./pipe-steel-work-config.repository";

@Injectable()
export class MongoPipeSteelWorkConfigRepository
  extends MongoCrudRepository<PipeSteelWorkConfigEntity>
  implements PipeSteelWorkConfigRepository
{
  constructor(@InjectModel("PipeSteelWorkConfigEntity") model: Model<PipeSteelWorkConfigEntity>) {
    super(model);
  }

  async findByConfigKey(key: string): Promise<PipeSteelWorkConfigEntity | null> {
    const document = await this.documents.findOne({ configKey: key }).lean().exec();
    return this.toDomain(document);
  }

  async findByCategoryOrdered(category: string): Promise<PipeSteelWorkConfigEntity[]> {
    const documents = await this.documents.find({ category }).sort({ configKey: 1 }).lean().exec();
    return this.toDomainList(documents);
  }

  async findAllOrdered(): Promise<PipeSteelWorkConfigEntity[]> {
    const documents = await this.documents.find().sort({ category: 1, configKey: 1 }).lean().exec();
    return this.toDomainList(documents);
  }
}

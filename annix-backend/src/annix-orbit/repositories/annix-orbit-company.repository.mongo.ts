import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { AnnixOrbitCompany } from "../entities/annix-orbit-company.entity";
import { AnnixOrbitCompanyRepository } from "./annix-orbit-company.repository";

@Injectable()
export class MongoAnnixOrbitCompanyRepository
  extends MongoCrudRepository<AnnixOrbitCompany>
  implements AnnixOrbitCompanyRepository
{
  constructor(@InjectModel("AnnixOrbitCompany") model: Model<AnnixOrbitCompany>) {
    super(model);
  }

  async mirrorCompany(id: number, name: string): Promise<void> {
    await this.documents
      .findByIdAndUpdate(id, { $set: { name }, $setOnInsert: { _id: id } }, { upsert: true })
      .exec();
  }
}

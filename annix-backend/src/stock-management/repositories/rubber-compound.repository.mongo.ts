import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import type { DeepPartial } from "../../lib/persistence/crud-repository";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { RubberCompound } from "../entities/rubber-compound.entity";
import { RubberCompoundRepository } from "./rubber-compound.repository";

@Injectable()
export class MongoRubberCompoundRepository
  extends MongoCrudRepository<RubberCompound>
  implements RubberCompoundRepository
{
  constructor(@InjectModel("RubberCompound") model: Model<RubberCompound>) {
    super(model);
  }

  build(data: DeepPartial<RubberCompound>): RubberCompound {
    return data as RubberCompound;
  }

  async saveMany(compounds: RubberCompound[]): Promise<RubberCompound[]> {
    return Promise.all(compounds.map((compound) => this.save(compound)));
  }

  async findForCompany(companyId: number, includeInactive: boolean): Promise<RubberCompound[]> {
    const query: Record<string, unknown> = { companyId };
    if (!includeInactive) {
      query.active = true;
    }
    const docs = await this.documents
      .find(query)
      .sort({ compoundFamily: 1, shoreHardness: 1, name: 1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findOneForCompany(companyId: number, id: number): Promise<RubberCompound | null> {
    const doc = await this.documents.findOne({ _id: id, companyId }).lean().exec();
    return this.toDomain(doc);
  }

  async findOneByCode(companyId: number, code: string): Promise<RubberCompound | null> {
    const doc = await this.documents.findOne({ companyId, code }).lean().exec();
    return this.toDomain(doc);
  }

  async findAllForCompany(companyId: number): Promise<RubberCompound[]> {
    const docs = await this.documents.find({ companyId }).lean().exec();
    return this.toDomainList(docs);
  }

  async updateById(id: number, patch: DeepPartial<RubberCompound>): Promise<void> {
    await this.documents.updateOne({ _id: id }, { $set: patch }).exec();
  }
}

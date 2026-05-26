import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { GlossaryTerm } from "../entities/glossary-term.entity";
import { GlossaryTermRepository } from "./glossary-term.repository";

@Injectable()
export class MongoGlossaryTermRepository
  extends MongoCrudRepository<GlossaryTerm>
  implements GlossaryTermRepository
{
  constructor(@InjectModel("GlossaryTerm") model: Model<GlossaryTerm>) {
    super(model);
  }

  async findForCompanyOrdered(companyId: number): Promise<GlossaryTerm[]> {
    const docs = await this.documents.find({ companyId }).sort({ abbreviation: 1 }).lean().exec();
    return this.toDomainList(docs);
  }

  async findOneForCompanyByAbbreviation(
    companyId: number,
    abbreviation: string,
  ): Promise<GlossaryTerm | null> {
    const doc = await this.documents.findOne({ companyId, abbreviation }).lean().exec();
    return this.toDomain(doc);
  }

  async deleteForCompanyByAbbreviation(companyId: number, abbreviation: string): Promise<void> {
    await this.documents.deleteMany({ companyId, abbreviation }).exec();
  }

  async deleteAllForCompany(companyId: number): Promise<void> {
    await this.documents.deleteMany({ companyId }).exec();
  }
}

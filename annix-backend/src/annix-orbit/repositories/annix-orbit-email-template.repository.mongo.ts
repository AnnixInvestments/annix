import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { ORBIT_CONNECTION } from "../../lib/persistence/mongo-connections";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import {
  AnnixOrbitEmailTemplate,
  CvEmailTemplateKind,
} from "../entities/annix-orbit-email-template.entity";
import { AnnixOrbitEmailTemplateRepository } from "./annix-orbit-email-template.repository";

@Injectable()
export class MongoAnnixOrbitEmailTemplateRepository
  extends MongoCrudRepository<AnnixOrbitEmailTemplate>
  implements AnnixOrbitEmailTemplateRepository
{
  constructor(
    @InjectModel("AnnixOrbitEmailTemplate", ORBIT_CONNECTION)
    model: Model<AnnixOrbitEmailTemplate>,
  ) {
    super(model);
  }

  async findForCompany(companyId: number): Promise<AnnixOrbitEmailTemplate[]> {
    const docs = await this.documents.find({ companyId }).lean().exec();
    return this.toDomainList(docs);
  }

  async findForCompanyKind(
    companyId: number,
    kind: CvEmailTemplateKind,
  ): Promise<AnnixOrbitEmailTemplate | null> {
    const doc = await this.documents.findOne({ companyId, kind }).lean().exec();
    return this.toDomain(doc);
  }

  async deleteForCompanyKind(companyId: number, kind: CvEmailTemplateKind): Promise<void> {
    await this.documents.deleteMany({ companyId, kind }).exec();
  }
}

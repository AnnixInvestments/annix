import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { JobCardImportMapping } from "../entities/job-card-import-mapping.entity";
import { JobCardImportMappingRepository } from "./job-card-import-mapping.repository";

@Injectable()
export class MongoJobCardImportMappingRepository
  extends MongoCrudRepository<JobCardImportMapping>
  implements JobCardImportMappingRepository
{
  constructor(
    @InjectModel("JobCardImportMapping")
    model: Model<JobCardImportMapping>,
  ) {
    super(model);
  }

  async findForCompany(companyId: number): Promise<JobCardImportMapping | null> {
    const doc = await this.documents.findOne({ companyId }).lean().exec();
    return this.toDomain(doc);
  }
}

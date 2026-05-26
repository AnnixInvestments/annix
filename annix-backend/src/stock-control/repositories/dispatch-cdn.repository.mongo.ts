import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { type DeepPartial } from "../../lib/persistence/crud-repository";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { DispatchCdn } from "../entities/dispatch-cdn.entity";
import { DispatchCdnRepository } from "./dispatch-cdn.repository";

@Injectable()
export class MongoDispatchCdnRepository
  extends MongoCrudRepository<DispatchCdn>
  implements DispatchCdnRepository
{
  constructor(@InjectModel("DispatchCdn") model: Model<DispatchCdn>) {
    super(model);
  }

  async findForJobCard(companyId: number, jobCardId: number): Promise<DispatchCdn[]> {
    const docs = await this.documents
      .find({ jobCardId, companyId })
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findOneForCompany(cdnId: number, companyId: number): Promise<DispatchCdn | null> {
    const doc = await this.documents.findOne({ _id: cdnId, companyId }).lean().exec();
    return this.toDomain(doc);
  }

  async updateById(cdnId: number, changes: DeepPartial<DispatchCdn>): Promise<void> {
    await this.documents.findByIdAndUpdate(cdnId, changes as Record<string, unknown>).exec();
  }
}

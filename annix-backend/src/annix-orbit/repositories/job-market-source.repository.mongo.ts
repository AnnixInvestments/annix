import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { ORBIT_CONNECTION } from "../../lib/persistence/mongo-connections";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { JobMarketSource, JobSourceProvider } from "../entities/job-market-source.entity";
import { JobMarketSourceRepository } from "./job-market-source.repository";

@Injectable()
export class MongoJobMarketSourceRepository
  extends MongoCrudRepository<JobMarketSource>
  implements JobMarketSourceRepository
{
  constructor(@InjectModel("JobMarketSource", ORBIT_CONNECTION) model: Model<JobMarketSource>) {
    super(model);
  }

  async findEnabled(): Promise<JobMarketSource[]> {
    const docs = await this.documents.find({ enabled: true }).lean().exec();
    return this.toDomainList(docs);
  }

  async findPlatformGlobal(): Promise<JobMarketSource[]> {
    const docs = await this.documents
      .find({ $or: [{ companyId: null }, { companyId: { $exists: false } }] })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findForCompany(companyId: number): Promise<JobMarketSource[]> {
    const docs = await this.documents.find({ companyId }).sort({ createdAt: -1 }).lean().exec();
    return this.toDomainList(docs);
  }

  async findByIdForCompany(id: number, companyId: number): Promise<JobMarketSource | null> {
    const doc = await this.documents.findOne({ _id: id, companyId }).lean().exec();
    return this.toDomain(doc);
  }

  async findByIds(ids: number[]): Promise<JobMarketSource[]> {
    if (ids.length === 0) return [];
    const docs = await this.documents
      .find({ _id: { $in: ids } })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async sourceIdsForCompany(companyId: number): Promise<number[]> {
    const docs = await this.documents.find({ companyId }).select("_id").lean().exec();
    return docs.map((d) => d._id as number);
  }

  async findEnabledByProvider(provider: JobSourceProvider): Promise<JobMarketSource | null> {
    const doc = await this.documents.findOne({ provider, enabled: true }).lean().exec();
    return this.toDomain(doc);
  }
}

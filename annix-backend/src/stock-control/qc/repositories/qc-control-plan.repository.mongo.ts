import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../../../lib/persistence/mongo-crud-repository";
import { QcControlPlan } from "../entities/qc-control-plan.entity";
import { QcControlPlanRepository } from "./qc-control-plan.repository";

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

@Injectable()
export class MongoQcControlPlanRepository
  extends MongoCrudRepository<QcControlPlan>
  implements QcControlPlanRepository
{
  constructor(@InjectModel("QcControlPlan") model: Model<QcControlPlan>) {
    super(model);
  }

  async findForJobCard(companyId: number, jobCardId: number): Promise<QcControlPlan[]> {
    const docs = await this.documents
      .find({ companyId, jobCardId })
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findForJobCardUnordered(companyId: number, jobCardId: number): Promise<QcControlPlan[]> {
    const docs = await this.documents.find({ companyId, jobCardId }).lean().exec();
    return this.toDomainList(docs);
  }

  async findForJobCardOrderedByCreatedAsc(
    companyId: number,
    jobCardId: number,
  ): Promise<QcControlPlan[]> {
    const docs = await this.documents
      .find({ companyId, jobCardId })
      .sort({ createdAt: 1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findForCpo(companyId: number, cpoId: number): Promise<QcControlPlan[]> {
    const docs = await this.documents
      .find({ companyId, cpoId })
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findCpoLevelForCpo(companyId: number, cpoId: number): Promise<QcControlPlan[]> {
    const docs = await this.documents.find({ companyId, cpoId, jobCardId: null }).lean().exec();
    return this.toDomainList(docs);
  }

  async findByIdForCompany(companyId: number, id: number): Promise<QcControlPlan | null> {
    const doc = await this.documents.findOne({ _id: id, companyId }).lean().exec();
    return this.toDomain(doc);
  }

  async search(companyId: number, search: string | null): Promise<QcControlPlan[]> {
    const filter: Record<string, unknown> = { companyId };
    if (search) {
      const pattern = escapeRegex(search);
      filter.$or = [
        { qcpNumber: { $regex: pattern, $options: "i" } },
        { jobNumber: { $regex: pattern, $options: "i" } },
      ];
    }
    const docs = await this.documents.find(filter).sort({ createdAt: -1 }).lean().exec();
    return this.toDomainList(docs);
  }

  async latestQcpNumberWithPrefix(companyId: number, prefix: string): Promise<string | null> {
    const doc = await this.documents
      .findOne({ companyId, qcpNumber: { $regex: `^${escapeRegex(prefix)}` } })
      .sort({ qcpNumber: -1 })
      .lean()
      .exec();
    const qcpNumber = doc ? (doc as { qcpNumber?: string | null }).qcpNumber : null;
    return qcpNumber ?? null;
  }

  async updateById(id: number, updates: Partial<QcControlPlan>): Promise<void> {
    await this.documents.updateOne({ _id: id }, { $set: updates }).exec();
  }
}

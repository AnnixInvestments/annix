import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { type DeepPartial } from "../../lib/persistence/crud-repository";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { JobCard } from "../entities/job-card.entity";
import { JobCardRepository, type JobCardSearchRow } from "./job-card.repository";

@Injectable()
export class MongoJobCardRepository
  extends MongoCrudRepository<JobCard>
  implements JobCardRepository
{
  constructor(@InjectModel("JobCard") model: Model<JobCard>) {
    super(model);
  }

  async findOneForCompany(id: number, companyId: number): Promise<JobCard | null> {
    const doc = await this.documents.findOne({ _id: id, companyId }).lean().exec();
    return this.toDomain(doc);
  }

  async findOneForCompanyWithLineItems(id: number, companyId: number): Promise<JobCard | null> {
    const doc = await this.documents
      .findOne({ _id: id, companyId })
      .populate("lineItems")
      .lean()
      .exec();
    return this.toDomain(doc);
  }

  async findOneForCompanyWithRelations(
    id: number,
    companyId: number,
    relations: string[],
  ): Promise<JobCard | null> {
    const doc = await this.documents
      .findOne({ _id: id, companyId })
      .populate(relations)
      .lean()
      .exec();
    return this.toDomain(doc);
  }

  async findOneForCompanySelectId(id: number, companyId: number): Promise<JobCard | null> {
    const doc = await this.documents.findOne({ _id: id, companyId }).select("_id").lean().exec();
    return this.toDomain(doc);
  }

  async findOneForCompanySelectIdNotes(id: number, companyId: number): Promise<JobCard | null> {
    const doc = await this.documents
      .findOne({ _id: id, companyId })
      .select("_id notes")
      .lean()
      .exec();
    return this.toDomain(doc);
  }

  async findById(id: number): Promise<JobCard | null> {
    const doc = await this.documents.findById(id).lean().exec();
    return this.toDomain(doc);
  }

  async findForCompanyByListPage(
    companyId: number,
    status: string | undefined,
    page: number,
    limit: number,
  ): Promise<JobCard[]> {
    const query: Record<string, unknown> = {
      companyId,
      supersededById: null,
      $or: [{ parentJobCardId: null }, { cpoId: { $ne: null } }],
    };
    if (status) {
      query.status = status;
    }
    const docs = await this.documents
      .find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async jtNumbersForJobCards(
    jobCardIds: number[],
  ): Promise<{ jobCardId: number; jtNumbers: string }[]> {
    const lineItems = this.model.db.collection("job_card_line_items");
    const rows = await lineItems
      .aggregate<{ _id: number; jtNumbers: string[] }>([
        {
          $match: {
            jobCardId: { $in: jobCardIds },
            jtNo: { $nin: [null, ""] },
          },
        },
        { $group: { _id: "$jobCardId", jtNumbers: { $addToSet: "$jtNo" } } },
      ])
      .toArray();
    return rows.map((row) => ({
      jobCardId: row._id,
      jtNumbers: [...row.jtNumbers].sort().join(", "),
    }));
  }

  async findDeliveryJobCards(companyId: number, parentJobCardId: number): Promise<JobCard[]> {
    const docs = await this.documents
      .find({ companyId, parentJobCardId })
      .populate("lineItems")
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findForCpo(cpoId: number, companyId: number): Promise<JobCard[]> {
    const docs = await this.documents.find({ cpoId, companyId }).lean().exec();
    return this.toDomainList(docs);
  }

  async findForCpoWithLineItemsOrdered(cpoId: number, companyId: number): Promise<JobCard[]> {
    const docs = await this.documents
      .find({ cpoId, companyId })
      .populate("lineItems")
      .sort({ createdAt: 1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findChildJobCardsByCpoCreatedAsc(cpoId: number, companyId: number): Promise<JobCard[]> {
    const docs = await this.documents
      .find({ cpoId, companyId })
      .sort({ createdAt: 1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findParentForCpo(cpoId: number, companyId: number): Promise<JobCard | null> {
    const doc = await this.documents
      .findOne({ companyId, cpoId, parentJobCardId: null })
      .lean()
      .exec();
    return this.toDomain(doc);
  }

  async findChildJobCardsByJobNumber(companyId: number, jobNumber: string): Promise<JobCard[]> {
    const docs = await this.documents
      .find({ companyId, jobNumber, parentJobCardId: { $ne: null } })
      .select("_id jtDnNumber")
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findActiveOrDraftForCompany(companyId: number): Promise<JobCard[]> {
    const docs = await this.documents
      .find({ companyId, status: { $in: ["draft", "active"] } })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findActiveJobCardsWithDedupeFields(companyId: number): Promise<JobCard[]> {
    const docs = await this.documents
      .find({ companyId, supersededById: null })
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findByIdsForCompany(jobCardIds: number[], companyId: number): Promise<JobCard[]> {
    const docs = await this.documents
      .find({ _id: { $in: jobCardIds }, companyId })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async searchAcrossCompaniesByNumberOrName(
    companyIds: number[],
    query: string,
    limit: number,
  ): Promise<JobCard[]> {
    const pattern = new RegExp(escapeRegExp(query), "i");
    const docs = await this.documents
      .find({
        companyId: { $in: companyIds },
        $or: [{ jcNumber: pattern }, { jobNumber: pattern }, { jobName: pattern }],
      })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async adjacentIds(
    id: number,
    companyId: number,
  ): Promise<{ previousId: number | null; nextId: number | null }> {
    const previous = await this.documents
      .findOne({ companyId, supersededById: null, _id: { $lt: id } })
      .sort({ _id: -1 })
      .select("_id")
      .lean()
      .exec();
    const next = await this.documents
      .findOne({ companyId, supersededById: null, _id: { $gt: id } })
      .sort({ _id: 1 })
      .select("_id")
      .lean()
      .exec();
    const prevRow = previous as Record<string, unknown> | null;
    const nextRow = next as Record<string, unknown> | null;
    return {
      previousId: prevRow ? ((prevRow._id as number) ?? null) : null,
      nextId: nextRow ? ((nextRow._id as number) ?? null) : null,
    };
  }

  async findPendingApprovalsForCompany(
    companyId: number,
    statuses: string[],
    page: number,
    limit: number,
  ): Promise<JobCard[]> {
    const docs = await this.documents
      .find({ companyId, workflowStatus: { $in: statuses }, status: "active" })
      .sort({ createdAt: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async searchForCompany(
    companyId: number,
    pattern: string,
    limit: number,
  ): Promise<JobCardSearchRow[]> {
    const term = pattern.replace(/%/g, "");
    const docs = await this.documents
      .find({
        companyId,
        $or: [
          { jobNumber: { $regex: term, $options: "i" } },
          { jcNumber: { $regex: term, $options: "i" } },
          { jobName: { $regex: term, $options: "i" } },
          { customerName: { $regex: term, $options: "i" } },
          { description: { $regex: term, $options: "i" } },
          { poNumber: { $regex: term, $options: "i" } },
        ],
      })
      .sort({ updatedAt: -1 })
      .limit(limit)
      .lean()
      .exec();
    return docs.map((doc) => {
      const row = doc as Record<string, unknown>;
      return {
        id: row._id as number,
        jobNumber: row.jobNumber as string,
        jcNumber: (row.jcNumber as string | null) ?? null,
        jobName: row.jobName as string,
        customerName: (row.customerName as string | null) ?? null,
        description: (row.description as string | null) ?? null,
        status: row.status as string,
        updatedAt: row.updatedAt as Date,
      };
    });
  }

  async findByQrToken(companyId: number, qrToken: string): Promise<JobCard | null> {
    const numericId = Number(qrToken);
    const idClause: Record<string, unknown>[] = Number.isNaN(numericId) ? [] : [{ _id: numericId }];
    const query: Record<string, unknown> = {
      companyId,
      $or: [...idClause, { jobNumber: qrToken }],
    };
    const doc = await this.documents.findOne(query).lean().exec();
    return this.toDomain(doc);
  }

  countByStatus(companyId: number, status: string): Promise<number> {
    return this.documents.countDocuments({ status, companyId }).exec();
  }

  countByWorkflowStatusAndStatuses(
    companyId: number,
    workflowStatus: string,
    statuses: string[],
  ): Promise<number> {
    return this.documents
      .countDocuments({ companyId, workflowStatus, status: { $in: statuses } })
      .exec();
  }

  async updateById(id: number, changes: DeepPartial<JobCard>): Promise<void> {
    await this.documents.findByIdAndUpdate(id, changes as Record<string, unknown>).exec();
  }

  async updateForCompany(
    id: number,
    companyId: number,
    changes: DeepPartial<JobCard>,
  ): Promise<void> {
    await this.documents
      .updateOne({ _id: id, companyId }, { $set: changes as Record<string, unknown> })
      .exec();
  }

  async updateWorkflowStatusIfMatches(
    id: number,
    companyId: number,
    expectedWorkflowStatus: string,
    nextWorkflowStatus: string,
  ): Promise<number> {
    const result = await this.documents
      .updateOne(
        { _id: id, companyId, workflowStatus: expectedWorkflowStatus },
        { $set: { workflowStatus: nextWorkflowStatus } },
      )
      .exec();
    return result.modifiedCount;
  }

  async saveMany(entities: JobCard[]): Promise<JobCard[]> {
    return Promise.all(entities.map((entity) => this.save(entity)));
  }

  build(data: DeepPartial<JobCard>): JobCard {
    return data as JobCard;
  }
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

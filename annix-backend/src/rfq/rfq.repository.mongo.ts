import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { type DeepPartial } from "../lib/persistence/crud-repository";
import { MongoCrudRepository } from "../lib/persistence/mongo-crud-repository";
import { Rfq } from "./entities/rfq.entity";
import { RfqPaginationParams, RfqRepository } from "./rfq.repository";

@Injectable()
export class MongoRfqRepository extends MongoCrudRepository<Rfq> implements RfqRepository {
  constructor(@InjectModel("Rfq") model: Model<Rfq>) {
    super(model);
  }

  async findBySubmissionId(submissionId: string): Promise<Rfq | null> {
    const document = await this.documents.findOne({ submissionId }).lean().exec();
    return this.toDomain(document);
  }

  async updateById(id: number, changes: DeepPartial<Rfq>): Promise<void> {
    await this.documents.findByIdAndUpdate(id, { $set: changes }).exec();
  }

  async updateByIdWhereStatus(
    id: number,
    fromStatus: string,
    changes: DeepPartial<Rfq>,
  ): Promise<Rfq | null> {
    const document = await this.documents
      .findOneAndUpdate({ _id: id, status: fromStatus }, { $set: changes }, { new: true })
      .lean()
      .exec();
    return this.toDomain(document);
  }

  async findStatusesByCreator(userId: number): Promise<Rfq[]> {
    const documents = await this.documents
      .find({ createdById: userId })
      .select({ _id: 1, status: 1 })
      .lean()
      .exec();
    return this.toDomainList(documents);
  }

  async findAllWithItemsOrdered(): Promise<Rfq[]> {
    const documents = await this.documents
      .find()
      .populate("items")
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    return this.toDomainList(documents);
  }

  async findPaginatedWithItems(params: RfqPaginationParams): Promise<[Rfq[], number]> {
    const filter: Record<string, unknown> = {};

    if (params.status) {
      filter.status = params.status;
    }

    if (params.search) {
      filter.$or = [
        { projectName: { $regex: params.search, $options: "i" } },
        { rfqNumber: { $regex: params.search, $options: "i" } },
      ];
    }

    const [documents, total] = await Promise.all([
      this.documents
        .find(filter)
        .populate("items")
        .sort({ createdAt: -1 })
        .skip(params.skip)
        .limit(params.take)
        .lean()
        .exec(),
      this.documents.countDocuments(filter).exec(),
    ]);

    return [this.toDomainList(documents), total];
  }

  async findUpcomingNonRejected(
    today: Date,
    until: Date,
    limit: number,
    excludedStatuses: string[],
  ): Promise<Rfq[]> {
    const documents = await this.documents
      .find({
        requiredDate: { $gte: today, $lte: until },
        status: { $nin: excludedStatuses },
      })
      .sort({ requiredDate: 1 })
      .limit(limit)
      .lean()
      .exec();
    return this.toDomainList(documents);
  }

  async findPumpRfqsAssignedToSupplier(supplierId: number, status?: string): Promise<Rfq[]> {
    const filter: Record<string, unknown> = { "supplierAssignments.supplierId": supplierId };
    if (status) {
      filter["supplierAssignments.status"] = status;
    }
    const documents = await this.documents
      .find(filter)
      .populate("items")
      .populate("supplierAssignments")
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    return this.toDomainList(documents);
  }
}

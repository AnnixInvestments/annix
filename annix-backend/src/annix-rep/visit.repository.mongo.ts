import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../lib/persistence/mongo-crud-repository";
import { Visit } from "./entities/visit.entity";
import { VisitRepository } from "./visit.repository";

@Injectable()
export class MongoVisitRepository extends MongoCrudRepository<Visit> implements VisitRepository {
  constructor(@InjectModel("Visit") model: Model<Visit>) {
    super(model);
  }

  async findAllForSalesRep(salesRepId: number): Promise<Visit[]> {
    const docs = await this.documents
      .find({ salesRepId })
      .populate("prospect")
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findByProspect(prospectId: number): Promise<Visit[]> {
    const docs = await this.documents.find({ prospectId }).sort({ createdAt: -1 }).lean().exec();
    return this.toDomainList(docs);
  }

  async findByDateRange(salesRepId: number, startDate: Date, endDate: Date): Promise<Visit[]> {
    const docs = await this.documents
      .find({
        salesRepId,
        scheduledAt: { $gte: startDate, $lte: endDate },
      })
      .populate("prospect")
      .sort({ scheduledAt: 1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findOneForSalesRep(salesRepId: number, id: number): Promise<Visit | null> {
    const doc = await this.documents
      .findOne({ _id: id, salesRepId })
      .populate("prospect")
      .lean()
      .exec();
    return this.toDomain(doc);
  }

  async findTodaysSchedule(salesRepId: number, dayStart: Date, dayEnd: Date): Promise<Visit[]> {
    const docs = await this.documents
      .find({
        salesRepId,
        scheduledAt: { $gte: dayStart, $lte: dayEnd },
      })
      .populate("prospect")
      .sort({ scheduledAt: 1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findActive(salesRepId: number, windowStart: Date, windowEnd: Date): Promise<Visit | null> {
    const doc = await this.documents
      .findOne({
        salesRepId,
        startedAt: { $gte: windowStart, $lte: windowEnd },
        endedAt: null,
      })
      .populate("prospect")
      .lean()
      .exec();
    return this.toDomain(doc);
  }

  async findBySalesRep(salesRepId: number): Promise<Visit[]> {
    const docs = await this.documents.find({ salesRepId }).lean().exec();
    return this.toDomainList(docs);
  }

  async findBySalesRepWithProspect(salesRepId: number): Promise<Visit[]> {
    const docs = await this.documents.find({ salesRepId }).populate("prospect").lean().exec();
    return this.toDomainList(docs);
  }

  async findBySalesRepStartedInRange(salesRepId: number, from: Date, to: Date): Promise<Visit[]> {
    const docs = await this.documents
      .find({ salesRepId, startedAt: { $gte: from, $lte: to } })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }
}

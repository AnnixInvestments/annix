import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { DeliveryNote } from "../entities/delivery-note.entity";
import {
  type DeliveryNoteAutoLinkRow,
  DeliveryNoteRepository,
  type DeliveryNoteSearchRow,
} from "./delivery-note.repository";

@Injectable()
export class MongoDeliveryNoteRepository
  extends MongoCrudRepository<DeliveryNote>
  implements DeliveryNoteRepository
{
  constructor(@InjectModel("DeliveryNote") model: Model<DeliveryNote>) {
    super(model);
  }

  async findOneByNumber(companyId: number, deliveryNumber: string): Promise<DeliveryNote | null> {
    const doc = await this.documents.findOne({ companyId, deliveryNumber }).lean().exec();
    return this.toDomain(doc);
  }

  async findOneForCompany(id: number, companyId: number): Promise<DeliveryNote | null> {
    const doc = await this.documents.findOne({ _id: id, companyId }).lean().exec();
    return this.toDomain(doc);
  }

  async findOneForCompanyWithItems(id: number, companyId: number): Promise<DeliveryNote | null> {
    const doc = await this.documents
      .findOne({ _id: id, companyId })
      .populate({ path: "items", populate: { path: "stockItem" } })
      .lean()
      .exec();
    return this.toDomain(doc);
  }

  async findPaginatedWithItems(
    companyId: number,
    page: number,
    limit: number,
  ): Promise<DeliveryNote[]> {
    const docs = await this.documents
      .find({ companyId })
      .populate({ path: "items", populate: { path: "stockItem" } })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findAllForCompanyByReceivedDate(companyId: number): Promise<DeliveryNote[]> {
    const docs = await this.documents.find({ companyId }).sort({ receivedDate: -1 }).lean().exec();
    return this.toDomainList(docs);
  }

  async findAutoLinkCandidates(companyId: number): Promise<DeliveryNoteAutoLinkRow[]> {
    const docs = await this.documents
      .find({ companyId })
      .select("_id deliveryNumber supplierName receivedDate")
      .lean()
      .exec();
    return docs.map((doc) => ({
      id: doc._id as number,
      deliveryNumber: doc.deliveryNumber as string,
      supplierName: doc.supplierName as string,
      receivedDate: (doc.receivedDate as Date) ?? null,
    }));
  }

  countPendingExtraction(companyId: number): Promise<number> {
    return this.documents.countDocuments({ companyId, extractionStatus: null }).exec();
  }

  countCompletedExtraction(companyId: number): Promise<number> {
    return this.documents.countDocuments({ companyId, extractionStatus: "completed" }).exec();
  }

  countCreatedSince(companyId: number, since: Date): Promise<number> {
    return this.documents.countDocuments({ companyId, createdAt: { $gte: since } }).exec();
  }

  async searchForCompany(
    companyId: number,
    pattern: string,
    limit: number,
  ): Promise<DeliveryNoteSearchRow[]> {
    const escaped = pattern.replace(/%/g, "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escaped, "i");
    const docs = await this.documents
      .find({
        companyId,
        $or: [{ deliveryNumber: regex }, { supplierName: regex }, { notes: regex }],
      })
      .select("_id deliveryNumber supplierName notes createdAt")
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean()
      .exec();
    return docs.map((doc) => ({
      id: doc._id as number,
      deliveryNumber: doc.deliveryNumber as string,
      supplierName: doc.supplierName as string,
      notes: (doc.notes as string) ?? null,
      createdAt: doc.createdAt as Date,
    }));
  }
}

import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { RollStockStatus, RubberRollStock } from "../entities/rubber-roll-stock.entity";
import {
  type RollStockListFilters,
  RubberRollStockRepository,
} from "./rubber-roll-stock.repository";

const ROLL_RELATIONS = ["compoundCoding", "soldToCompany"];

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

@Injectable()
export class MongoRubberRollStockRepository
  extends MongoCrudRepository<RubberRollStock>
  implements RubberRollStockRepository
{
  constructor(@InjectModel("RubberRollStock") model: Model<RubberRollStock>) {
    super(model);
  }

  build(data: Partial<RubberRollStock>): RubberRollStock {
    return data as RubberRollStock;
  }

  async saveMany(entities: RubberRollStock[]): Promise<RubberRollStock[]> {
    const saved = await Promise.all(entities.map((entity) => this.save(entity)));
    return saved;
  }

  async removeMany(entities: RubberRollStock[]): Promise<void> {
    await Promise.all(entities.map((entity) => this.remove(entity)));
  }

  async deleteById(id: number): Promise<boolean> {
    const result = await this.documents.deleteOne({ _id: id }).exec();
    return result.deletedCount > 0;
  }

  inStockCount(): Promise<number> {
    return this.documents.countDocuments({ status: RollStockStatus.IN_STOCK }).exec();
  }

  reservedCount(): Promise<number> {
    return this.documents.countDocuments({ status: RollStockStatus.RESERVED }).exec();
  }

  async findFilteredWithRelations(filters?: RollStockListFilters): Promise<RubberRollStock[]> {
    const filter: Record<string, unknown> = {};
    if (filters?.status) {
      filter.status = filters.status;
    }
    if (filters?.compoundCodingId) {
      filter.compoundCodingId = filters.compoundCodingId;
    }
    if (filters?.soldToCompanyId) {
      filter.soldToCompanyId = filters.soldToCompanyId;
    }
    const docs = await this.documents
      .find(filter)
      .populate(ROLL_RELATIONS)
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findOneByIdWithRelations(id: number): Promise<RubberRollStock | null> {
    const doc = await this.documents.findById(id).populate(ROLL_RELATIONS).lean().exec();
    return this.toDomain(doc);
  }

  async findOneByRollNumberWithRelations(rollNumber: string): Promise<RubberRollStock | null> {
    const doc = await this.documents.findOne({ rollNumber }).populate(ROLL_RELATIONS).lean().exec();
    return this.toDomain(doc);
  }

  async findOneByRollNumber(rollNumber: string): Promise<RubberRollStock | null> {
    const doc = await this.documents.findOne({ rollNumber }).lean().exec();
    return this.toDomain(doc);
  }

  async findOneByRollNumberWithCoding(rollNumber: string): Promise<RubberRollStock | null> {
    const doc = await this.documents
      .findOne({ rollNumber })
      .populate("compoundCoding")
      .lean()
      .exec();
    return this.toDomain(doc);
  }

  async findOneByRollNumberSuffixWithCoding(rollNumber: string): Promise<RubberRollStock | null> {
    const doc = await this.documents
      .findOne({
        rollNumber: { $regex: `-${escapeRegExp(rollNumber)}$`, $options: "i" },
      })
      .populate("compoundCoding")
      .lean()
      .exec();
    return this.toDomain(doc);
  }

  async findOneByRollNumberLikeWithCoding(
    rollNumberFragment: string,
  ): Promise<RubberRollStock | null> {
    const doc = await this.documents
      .findOne({
        rollNumber: { $regex: escapeRegExp(rollNumberFragment), $options: "i" },
      })
      .populate("compoundCoding")
      .lean()
      .exec();
    return this.toDomain(doc);
  }

  async findOneByAttributesWithCoding(
    compoundCodingId: number,
    weightKg: number,
    status: RollStockStatus,
  ): Promise<RubberRollStock | null> {
    const doc = await this.documents
      .findOne({ compoundCodingId, weightKg, status })
      .populate("compoundCoding")
      .lean()
      .exec();
    return this.toDomain(doc);
  }

  async findManyByRollNumbers(rollNumbers: string[]): Promise<RubberRollStock[]> {
    const docs = await this.documents
      .find({ rollNumber: { $in: rollNumbers } })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findManyByRollNumbersWithRelations(rollNumbers: string[]): Promise<RubberRollStock[]> {
    const docs = await this.documents
      .find({ rollNumber: { $in: rollNumbers } })
      .populate(ROLL_RELATIONS)
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findManyByIdsWithCoding(ids: number[]): Promise<RubberRollStock[]> {
    const docs = await this.documents
      .find({ _id: { $in: ids } })
      .populate("compoundCoding")
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findManyByCustomerTaxInvoiceId(customerTaxInvoiceId: number): Promise<RubberRollStock[]> {
    const docs = await this.documents.find({ customerTaxInvoiceId }).lean().exec();
    return this.toDomainList(docs);
  }

  async findManyByCustomerDeliveryNoteId(
    customerDeliveryNoteId: number,
  ): Promise<RubberRollStock[]> {
    const docs = await this.documents.find({ customerDeliveryNoteId }).lean().exec();
    return this.toDomainList(docs);
  }

  async findManyBySupplierDeliveryNoteId(
    supplierDeliveryNoteId: number,
  ): Promise<RubberRollStock[]> {
    const docs = await this.documents.find({ supplierDeliveryNoteId }).lean().exec();
    return this.toDomainList(docs);
  }

  async findManyBySupplierTaxInvoiceId(supplierTaxInvoiceId: number): Promise<RubberRollStock[]> {
    const docs = await this.documents.find({ supplierTaxInvoiceId }).lean().exec();
    return this.toDomainList(docs);
  }

  async findManyByCompoundCodingIdAndStatusOrdered(
    compoundCodingId: number,
    status: RollStockStatus,
  ): Promise<RubberRollStock[]> {
    const docs = await this.documents
      .find({ compoundCodingId, status })
      .populate(ROLL_RELATIONS)
      .sort({ rollNumber: 1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async setAuCocIdForRollIds(rollIds: number[], auCocId: number): Promise<void> {
    await this.documents.updateMany({ _id: { $in: rollIds } }, { $set: { auCocId } }).exec();
  }

  async clearAuCocId(auCocId: number): Promise<void> {
    await this.documents.updateMany({ auCocId }, { $set: { auCocId: null } }).exec();
  }

  async findOneByIdWithCoding(id: number): Promise<RubberRollStock | null> {
    const doc = await this.documents.findById(id).populate("compoundCoding").lean().exec();
    return this.toDomain(doc);
  }

  async findAllWithCodingByStatusOrdered(status?: string): Promise<RubberRollStock[]> {
    const filter: Record<string, unknown> = {};
    if (status) {
      filter.status = status;
    }
    const docs = await this.documents
      .find(filter)
      .populate("compoundCoding")
      .sort({ rollNumber: 1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }
}

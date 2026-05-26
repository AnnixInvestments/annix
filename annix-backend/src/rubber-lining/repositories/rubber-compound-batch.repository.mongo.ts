import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { DocumentVersionStatus } from "../entities/document-version.types";
import { RubberCompoundBatch } from "../entities/rubber-compound-batch.entity";
import { SupplierCocType } from "../entities/rubber-supplier-coc.entity";
import { RubberCompoundBatchRepository } from "./rubber-compound-batch.repository";

type Doc = Record<string, unknown>;

function numericBatchSort(a: RubberCompoundBatch, b: RubberCompoundBatch): number {
  const aNumeric = /^[0-9]+$/.test(a.batchNumber) ? Number.parseInt(a.batchNumber, 10) : 0;
  const bNumeric = /^[0-9]+$/.test(b.batchNumber) ? Number.parseInt(b.batchNumber, 10) : 0;
  if (aNumeric !== bNumeric) {
    return aNumeric - bNumeric;
  }
  return a.batchNumber.localeCompare(b.batchNumber);
}

@Injectable()
export class MongoRubberCompoundBatchRepository
  extends MongoCrudRepository<RubberCompoundBatch>
  implements RubberCompoundBatchRepository
{
  constructor(@InjectModel("RubberCompoundBatch") model: Model<RubberCompoundBatch>) {
    super(model);
  }

  build(data: Partial<RubberCompoundBatch>): RubberCompoundBatch {
    return data as RubberCompoundBatch;
  }

  async saveMany(entities: RubberCompoundBatch[]): Promise<RubberCompoundBatch[]> {
    return Promise.all(entities.map((entity) => this.save(entity)));
  }

  async findByIdsWithSupplierCocOrdered(ids: number[]): Promise<RubberCompoundBatch[]> {
    const docs = await this.documents
      .find({ _id: { $in: ids } })
      .sort({ batchNumber: 1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findByIdsWithRelations(ids: number[]): Promise<RubberCompoundBatch[]> {
    const docs = await this.documents
      .find({ _id: { $in: ids } })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  countBySupplierCocId(supplierCocId: number): Promise<number> {
    return this.documents.countDocuments({ supplierCocId }).exec();
  }

  async findBySupplierCocIdOrdered(supplierCocId: number): Promise<RubberCompoundBatch[]> {
    const docs = await this.documents
      .find({ supplierCocId })
      .sort({ batchNumber: 1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async deleteBySupplierCocId(supplierCocId: number): Promise<void> {
    await this.documents.deleteMany({ supplierCocId }).exec();
  }

  async deleteAllWithSupplierCoc(): Promise<number> {
    const result = await this.documents.deleteMany({ supplierCocId: { $ne: null } }).exec();
    return result.deletedCount || 0;
  }

  async findOneByIdWithRelations(id: number): Promise<RubberCompoundBatch | null> {
    const doc = await this.documents.findById(id).lean().exec();
    return this.toDomain(doc);
  }

  async completeBatchesForCompound(compoundCode: string): Promise<RubberCompoundBatch[]> {
    const cocIds = await this.compounderCocIdsForCompound(compoundCode);
    const docs = await this.documents
      .find({
        supplierCocId: { $in: cocIds },
        shoreAHardness: { $ne: null },
        specificGravity: { $ne: null },
        tensileStrengthMpa: { $ne: null },
        elongationPercent: { $ne: null },
        tearStrengthKnM: { $ne: null },
        rheometerTc90: { $ne: null },
      })
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findBySupplierCocIdWithRelationsOrdered(
    supplierCocId: number,
  ): Promise<RubberCompoundBatch[]> {
    const docs = await this.documents.find({ supplierCocId }).lean().exec();
    return this.toDomainList(docs).sort(numericBatchSort);
  }

  async findByBatchNumbersForActiveCocOrdered(
    batchNumbers: string[],
    equivalentCompoundCodes: string[],
  ): Promise<RubberCompoundBatch[]> {
    const cocFilter: Doc = { versionStatus: DocumentVersionStatus.ACTIVE };
    if (equivalentCompoundCodes.length > 0) {
      cocFilter.compoundCode = { $in: equivalentCompoundCodes };
    }
    const cocIds = await this.cocIds(cocFilter);
    const docs = await this.documents
      .find({ batchNumber: { $in: batchNumbers }, supplierCocId: { $in: cocIds } })
      .lean()
      .exec();
    return this.toDomainList(docs).sort(numericBatchSort);
  }

  async findByBatchNumbersWithStockForActiveCoc(
    batchNumbers: string[],
  ): Promise<RubberCompoundBatch[]> {
    const cocIds = await this.cocIds({ versionStatus: DocumentVersionStatus.ACTIVE });
    const docs = await this.documents
      .find({ batchNumber: { $in: batchNumbers }, supplierCocId: { $in: cocIds } })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  private async compounderCocIdsForCompound(compoundCode: string): Promise<number[]> {
    return this.cocIds({ compoundCode, cocType: SupplierCocType.COMPOUNDER });
  }

  private async cocIds(filter: Doc): Promise<number[]> {
    const cocModel = this.model.db.model<Doc>("RubberSupplierCoc");
    const cocs = await cocModel.find(filter).select("_id").lean().exec();
    return cocs.map((coc) => coc._id as number);
  }
}

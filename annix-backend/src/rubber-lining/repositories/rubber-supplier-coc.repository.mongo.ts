import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import type { DeepPartial } from "../../lib/persistence/crud-repository";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { DocumentVersionStatus } from "../entities/document-version.types";
import {
  CocProcessingStatus,
  RubberSupplierCoc,
  SupplierCocType,
} from "../entities/rubber-supplier-coc.entity";
import {
  RubberSupplierCocRepository,
  type SupplierCocExportFilters,
  type SupplierCocListFilters,
} from "./rubber-supplier-coc.repository";

type Doc = Record<string, unknown>;

@Injectable()
export class MongoRubberSupplierCocRepository
  extends MongoCrudRepository<RubberSupplierCoc>
  implements RubberSupplierCocRepository
{
  constructor(@InjectModel("RubberSupplierCoc") model: Model<RubberSupplierCoc>) {
    super(model);
  }

  build(data: Partial<RubberSupplierCoc>): RubberSupplierCoc {
    return data as RubberSupplierCoc;
  }

  saveMany(entities: RubberSupplierCoc[]): Promise<RubberSupplierCoc[]> {
    return Promise.all(entities.map((entity) => this.save(entity)));
  }

  async updateById(id: number, updates: DeepPartial<RubberSupplierCoc>): Promise<void> {
    await this.documents.updateOne({ _id: id }, { $set: updates }).exec();
  }

  async deleteById(id: number): Promise<boolean> {
    const result = await this.documents.deleteOne({ _id: id }).exec();
    return (result.deletedCount || 0) > 0;
  }

  async findByCocTypeSelectingIdentity(cocType: SupplierCocType): Promise<RubberSupplierCoc[]> {
    const docs = await this.documents
      .find({ cocType })
      .select("_id compoundCode documentPath")
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findIdsMissingCocNumber(): Promise<number[]> {
    const docs = await this.documents
      .find({
        $or: [{ cocNumber: null }, { cocNumber: "" }],
        versionStatus: DocumentVersionStatus.ACTIVE,
        documentPath: { $ne: null },
      })
      .select("_id")
      .sort({ _id: -1 })
      .lean()
      .exec();
    return docs.map((d) => d._id as number);
  }

  async findForListing(filters?: SupplierCocListFilters): Promise<RubberSupplierCoc[]> {
    const filter: Doc = {};
    if (filters?.versionStatus) {
      filter.versionStatus = filters.versionStatus;
    } else if (!filters?.includeAllVersions) {
      filter.versionStatus = DocumentVersionStatus.ACTIVE;
    }
    if (filters?.cocType) {
      filter.cocType = filters.cocType;
    }
    if (filters?.processingStatus) {
      filter.processingStatus = filters.processingStatus;
    }
    if (filters?.supplierCompanyId) {
      filter.supplierCompanyId = filters.supplierCompanyId;
    }
    const docs = await this.documents
      .find(filter)
      .populate("supplierCompany")
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findPendingAuthorizationWithCompany(): Promise<RubberSupplierCoc[]> {
    const docs = await this.documents
      .find({ versionStatus: DocumentVersionStatus.PENDING_AUTHORIZATION })
      .populate("supplierCompany")
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findByIdWithCompany(id: number): Promise<RubberSupplierCoc | null> {
    const doc = await this.documents.findById(id).populate("supplierCompany").lean().exec();
    return this.toDomain(doc);
  }

  async findSiblingsByDocumentPathExcludingId(
    documentPath: string,
    id: number,
  ): Promise<RubberSupplierCoc[]> {
    const docs = await this.documents
      .find({ documentPath, _id: { $ne: id } })
      .populate("supplierCompany")
      .sort({ _id: 1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findOneByDocumentHash(documentHash: string): Promise<RubberSupplierCoc | null> {
    const doc = await this.documents.findOne({ documentHash }).lean().exec();
    return this.toDomain(doc);
  }

  async findMissingDocumentHash(): Promise<RubberSupplierCoc[]> {
    const docs = await this.documents
      .find({ documentHash: null })
      .select("_id documentPath")
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async markExtractionFailedIfPending(id: number): Promise<void> {
    await this.documents
      .updateOne(
        { _id: id, processingStatus: CocProcessingStatus.PENDING },
        { $set: { processingStatus: CocProcessingStatus.FAILED } },
      )
      .exec();
  }

  async findCalenderRollSiblingsByDocumentPath(
    documentPath: string | null,
  ): Promise<RubberSupplierCoc[]> {
    const docs = await this.documents
      .find({ documentPath, cocType: SupplierCocType.CALENDER_ROLL })
      .sort({ _id: 1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findActiveWithCocNumber(): Promise<RubberSupplierCoc[]> {
    const docs = await this.documents
      .find({
        versionStatus: DocumentVersionStatus.ACTIVE,
        cocNumber: { $nin: [null, ""] },
      })
      .sort({ _id: 1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async deleteAllAndResetSequence(): Promise<number> {
    const result = await this.documents.deleteMany({}).exec();
    return result.deletedCount || 0;
  }

  countByVersionStatus(versionStatus: DocumentVersionStatus): Promise<number> {
    return this.documents.countDocuments({ versionStatus }).exec();
  }

  async findByCocType(cocType: SupplierCocType): Promise<RubberSupplierCoc[]> {
    const docs = await this.documents.find({ cocType }).lean().exec();
    return this.toDomainList(docs);
  }

  async findByCocTypeWithCompany(cocType: SupplierCocType): Promise<RubberSupplierCoc[]> {
    const docs = await this.documents.find({ cocType }).populate("supplierCompany").lean().exec();
    return this.toDomainList(docs);
  }

  async findActiveByCocType(cocType: SupplierCocType): Promise<RubberSupplierCoc[]> {
    const docs = await this.documents
      .find({ cocType, versionStatus: DocumentVersionStatus.ACTIVE })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findCompoundersByCompoundCodes(codes: string[]): Promise<RubberSupplierCoc[]> {
    const docs = await this.documents
      .find({ cocType: SupplierCocType.COMPOUNDER, compoundCode: { $in: codes } })
      .sort({ _id: -1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findOneCalenderRollByOrderNumber(orderNumber: string): Promise<RubberSupplierCoc | null> {
    const doc = await this.documents
      .findOne({ cocType: SupplierCocType.CALENDARER, orderNumber })
      .sort({ _id: -1 })
      .lean()
      .exec();
    return this.toDomain(doc);
  }

  async findOneByCocTypeAndOrderNumberLatest(
    cocType: SupplierCocType,
    orderNumber: string,
  ): Promise<RubberSupplierCoc | null> {
    const doc = await this.documents
      .findOne({ cocType, orderNumber })
      .sort({ _id: -1 })
      .lean()
      .exec();
    return this.toDomain(doc);
  }

  async findByIds(ids: number[]): Promise<RubberSupplierCoc[]> {
    const docs = await this.documents
      .find({ _id: { $in: ids } })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findByIdsWithCompany(ids: number[]): Promise<RubberSupplierCoc[]> {
    const docs = await this.documents
      .find({ _id: { $in: ids } })
      .populate("supplierCompany")
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findIdAndCocNumberByIds(ids: number[]): Promise<RubberSupplierCoc[]> {
    const docs = await this.documents
      .find({ _id: { $in: ids } })
      .select("_id cocNumber")
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findExportable(filters: SupplierCocExportFilters): Promise<RubberSupplierCoc[]> {
    const filter: Doc = {
      processingStatus: { $in: [CocProcessingStatus.EXTRACTED, CocProcessingStatus.APPROVED] },
    };
    if (filters.dateFrom || filters.dateTo) {
      const createdAt: Doc = {};
      if (filters.dateFrom) {
        createdAt.$gte = filters.dateFrom;
      }
      if (filters.dateTo) {
        createdAt.$lte = filters.dateTo;
      }
      filter.createdAt = createdAt;
    }
    if (filters.excludeExported) {
      filter.exportedToSageAt = null;
    }
    const docs = await this.documents
      .find(filter)
      .populate("supplierCompany")
      .sort({ createdAt: 1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async markExportedByIds(ids: number[], exportedAt: Date): Promise<void> {
    await this.documents
      .updateMany({ _id: { $in: ids } }, { $set: { exportedToSageAt: exportedAt } })
      .exec();
  }

  async findBySupplierCompanyIdLatest(companyId: number): Promise<RubberSupplierCoc[]> {
    const docs = await this.documents
      .find({ supplierCompanyId: companyId })
      .sort({ _id: -1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findByVersionStatus(versionStatus: DocumentVersionStatus): Promise<RubberSupplierCoc[]> {
    const docs = await this.documents.find({ versionStatus }).lean().exec();
    return this.toDomainList(docs);
  }

  async findOneCalendererByCompanyAndExtractedOrder(
    companyId: number,
    orderNumber: string,
  ): Promise<RubberSupplierCoc | null> {
    const doc = await this.documents
      .findOne({
        cocType: SupplierCocType.CALENDARER,
        supplierCompanyId: companyId,
        "extractedData.orderNumber": orderNumber,
      })
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    return this.toDomain(doc);
  }

  async findOneCompounderByBatchNumbersOverlap(
    batchNumbers: string[],
  ): Promise<RubberSupplierCoc | null> {
    const doc = await this.documents
      .findOne({
        cocType: SupplierCocType.COMPOUNDER,
        "extractedData.batchNumbers": { $in: batchNumbers },
      })
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    return this.toDomain(doc);
  }

  async findByCocTypeWithOrderNumber(cocType: SupplierCocType): Promise<RubberSupplierCoc[]> {
    const docs = await this.documents
      .find({ cocType, orderNumber: { $ne: null } })
      .sort({ _id: -1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async distinctCompoundCodesByCocType(cocType: SupplierCocType): Promise<string[]> {
    const codes = await this.documents.distinct("compoundCode", {
      cocType,
      compoundCode: { $ne: null },
    });
    return (codes as unknown[])
      .map((code) => code as string)
      .filter((code) => code && code.trim() !== "");
  }

  async findOneActiveByNormalizedNumberAndType(
    normalizedCocNumber: string,
    cocType: SupplierCocType,
    options: { excludeId?: number; supplierCompanyId?: number } = {},
  ): Promise<RubberSupplierCoc | null> {
    const normalizedExpr = {
      $toLower: {
        $trim: {
          input: {
            $replaceAll: {
              input: {
                $replaceAll: { input: { $ifNull: ["$cocNumber", ""] }, find: " ", replacement: "" },
              },
              find: "–",
              replacement: "-",
            },
          },
        },
      },
    };
    const filter: Record<string, unknown> = {
      cocType,
      versionStatus: DocumentVersionStatus.ACTIVE,
      $expr: { $eq: [normalizedExpr, normalizedCocNumber.toLowerCase()] },
    };
    if (options.excludeId !== undefined) {
      filter._id = { $ne: options.excludeId };
    }
    if (options.supplierCompanyId !== undefined) {
      filter.supplierCompanyId = options.supplierCompanyId;
    }
    const doc = await this.documents.findOne(filter).sort({ _id: -1 }).lean().exec();
    return this.toDomain(doc);
  }

  async findNewerVersionsByPreviousId(id: number): Promise<RubberSupplierCoc[]> {
    const docs = await this.documents.find({ previousVersionId: id }).lean().exec();
    return this.toDomainList(docs);
  }

  async repointLinkedDeliveryNoteId(oldId: number, newId: number): Promise<void> {
    await this.documents
      .updateMany({ linkedDeliveryNoteId: oldId }, { $set: { linkedDeliveryNoteId: newId } })
      .exec();
  }

  async findWithOrderNumberOrderedByIdDesc(): Promise<RubberSupplierCoc[]> {
    const docs = await this.documents
      .find({ orderNumber: { $ne: null } })
      .sort({ _id: -1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findUpstreamCocsByCdnRollTrace(cdnId: number): Promise<RubberSupplierCoc[]> {
    const activeStatuses = {
      $nin: [DocumentVersionStatus.REJECTED, DocumentVersionStatus.SUPERSEDED],
    };
    const docs = (await this.documents
      .aggregate([
        { $match: { versionStatus: activeStatuses } },
        {
          $lookup: {
            from: "rubber_delivery_notes",
            let: { cocId: "$_id" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ["$linkedCocId", "$$cocId"] },
                      { $not: [{ $in: ["$versionStatus", ["REJECTED", "SUPERSEDED"]] }] },
                    ],
                  },
                },
              },
              {
                $lookup: {
                  from: "rubber_roll_stock",
                  localField: "_id",
                  foreignField: "supplierDeliveryNoteId",
                  as: "rolls",
                },
              },
              { $unwind: "$rolls" },
              {
                $lookup: {
                  from: "rubber_delivery_note_items",
                  let: { rollNumber: "$rolls.rollNumber" },
                  pipeline: [
                    {
                      $match: {
                        $expr: {
                          $and: [
                            { $eq: ["$rollNumber", "$$rollNumber"] },
                            { $eq: ["$deliveryNoteId", cdnId] },
                          ],
                        },
                      },
                    },
                  ],
                  as: "cdnItems",
                },
              },
              { $match: { "cdnItems.0": { $exists: true } } },
            ],
            as: "traceMatches",
          },
        },
        { $match: { "traceMatches.0": { $exists: true } } },
        { $sort: { _id: -1 } },
      ])
      .exec()) as Doc[];
    return this.toDomainList(docs);
  }

  async findActiveWithCocNumberOrderedByIdDesc(): Promise<RubberSupplierCoc[]> {
    const docs = await this.documents
      .find({
        cocNumber: { $ne: null },
        versionStatus: {
          $nin: [DocumentVersionStatus.REJECTED, DocumentVersionStatus.SUPERSEDED],
        },
      })
      .sort({ _id: -1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }
}

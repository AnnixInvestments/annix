import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import type { DeepPartial } from "../../lib/persistence/crud-repository";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { DocumentVersionStatus } from "../entities/document-version.types";
import {
  DeliveryNoteStatus,
  DeliveryNoteType,
  RubberDeliveryNote,
} from "../entities/rubber-delivery-note.entity";
import {
  type DeliveryNoteListFilters,
  type DeliveryNotePage,
  type DeliveryNotePageFilters,
  RubberDeliveryNoteRepository,
  type SupplierDnReconciliationRow,
} from "./rubber-delivery-note.repository";

type Doc = Record<string, unknown>;

const MONGO_SORT_FIELD_MAP: Record<string, string> = {
  "dn.created_at": "createdAt",
  "dn.delivery_note_number": "deliveryNoteNumber",
  "dn.customer_reference": "customerReference",
  "dn.delivery_date": "deliveryDate",
  "dn.status": "status",
};

@Injectable()
export class MongoRubberDeliveryNoteRepository
  extends MongoCrudRepository<RubberDeliveryNote>
  implements RubberDeliveryNoteRepository
{
  constructor(
    @InjectModel("RubberDeliveryNote")
    model: Model<RubberDeliveryNote>,
  ) {
    super(model);
  }

  build(data: Partial<RubberDeliveryNote>): RubberDeliveryNote {
    return data as RubberDeliveryNote;
  }

  saveMany(entities: RubberDeliveryNote[]): Promise<RubberDeliveryNote[]> {
    return Promise.all(entities.map((entity) => this.save(entity)));
  }

  async updateById(id: number, updates: DeepPartial<RubberDeliveryNote>): Promise<void> {
    await this.documents.updateOne({ _id: id }, { $set: updates }).exec();
  }

  async updatePendingToFailed(id: number): Promise<void> {
    await this.documents
      .updateOne(
        { _id: id, status: DeliveryNoteStatus.PENDING },
        { $set: { status: DeliveryNoteStatus.FAILED } },
      )
      .exec();
  }

  async deleteById(id: number): Promise<boolean> {
    const result = await this.documents.deleteOne({ _id: id }).exec();
    return (result.deletedCount || 0) > 0;
  }

  async findFiltered(filters?: DeliveryNoteListFilters): Promise<RubberDeliveryNote[]> {
    const filter = await this.listFilter(filters);
    const docs = await this.documents
      .find(filter)
      .populate(["supplierCompany", "linkedCoc"])
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findPaginated(
    filters: DeliveryNotePageFilters,
    sortColumnMap: Record<string, string>,
  ): Promise<DeliveryNotePage> {
    const page = Math.max(1, filters.page ?? 1);
    const pageSize = Math.max(1, Math.min(200, filters.pageSize ?? 25));
    const skip = (page - 1) * pageSize;

    const filter = await this.listFilter(filters);
    if (filters.search) {
      const pattern = new RegExp(filters.search, "i");
      filter.$or = [{ deliveryNoteNumber: pattern }, { customerReference: pattern }];
    }

    const sortKey = filters.sortColumn ?? "createdAt";
    const sortColumn = sortColumnMap[sortKey] ?? "dn.created_at";
    const sortField = MONGO_SORT_FIELD_MAP[sortColumn] ?? "createdAt";
    const sortDirection = filters.sortDirection === "asc" ? 1 : -1;

    const total = await this.documents.countDocuments(filter).exec();
    const docs = await this.documents
      .find(filter)
      .populate(["supplierCompany", "linkedCoc"])
      .sort({ [sortField]: sortDirection, _id: -1 })
      .skip(skip)
      .limit(pageSize)
      .lean()
      .exec();
    return { items: this.toDomainList(docs), total, page, pageSize };
  }

  async documentPathSiblingCounts(docPaths: string[]): Promise<Map<string, number>> {
    if (docPaths.length === 0) {
      return new Map();
    }
    const grouped = await this.documents
      .aggregate<{ _id: string; count: number }>([
        {
          $match: {
            documentPath: { $in: docPaths },
            versionStatus: DocumentVersionStatus.ACTIVE,
          },
        },
        { $group: { _id: "$documentPath", count: { $sum: 1 } } },
      ])
      .exec();
    return new Map(grouped.map((g) => [g._id, g.count]));
  }

  async findManyByIds(ids: number[]): Promise<RubberDeliveryNote[]> {
    const docs = await this.documents
      .find({ _id: { $in: ids } })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findByNumberAndCompany(
    deliveryNoteNumber: string,
    supplierCompanyId: number,
  ): Promise<RubberDeliveryNote | null> {
    const doc = await this.documents
      .findOne({ deliveryNoteNumber, supplierCompanyId })
      .populate(["supplierCompany", "linkedCoc"])
      .lean()
      .exec();
    return this.toDomain(doc);
  }

  async findSiblingLinkedDeliveryNote(
    excludeId: number,
    supplierCompanyId: number,
    customerReference: string | null,
  ): Promise<RubberDeliveryNote | null> {
    const doc = await this.documents
      .findOne({
        linkedCocId: { $ne: null },
        _id: { $ne: excludeId },
        supplierCompanyId,
        customerReference,
      })
      .populate("linkedCoc")
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    return this.toDomain(doc);
  }

  async findRollDeliveryNotesByCompanyIds(companyIds: number[]): Promise<RubberDeliveryNote[]> {
    const docs = await this.documents
      .find({
        supplierCompanyId: { $in: companyIds },
        deliveryNoteType: DeliveryNoteType.ROLL,
      })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findUnlinkedBySupplierAndStatuses(
    supplierCompanyId: number,
    statuses: DeliveryNoteStatus[],
  ): Promise<RubberDeliveryNote[]> {
    const docs = await this.documents
      .find({
        supplierCompanyId,
        linkedCocId: null,
        status: { $in: statuses },
      })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findAllUnlinked(): Promise<RubberDeliveryNote[]> {
    const docs = await this.documents.find({ linkedCocId: null }).lean().exec();
    return this.toDomainList(docs);
  }

  async findOverdueWithoutCoc(
    supplierCompanyIds: number[],
    cutoff: Date,
  ): Promise<RubberDeliveryNote[]> {
    if (supplierCompanyIds.length === 0) {
      return [];
    }
    const docs = await this.documents
      .find({
        supplierCompanyId: { $in: supplierCompanyIds },
        linkedCocId: null,
        cocOverdueWarnedAt: null,
        status: { $ne: DeliveryNoteStatus.FAILED },
        versionStatus: DocumentVersionStatus.ACTIVE,
        createdAt: { $lte: cutoff },
      })
      .sort({ createdAt: 1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async markCocOverdueWarned(ids: number[], warnedAt: Date): Promise<void> {
    if (ids.length === 0) {
      return;
    }
    await this.documents
      .updateMany({ _id: { $in: ids } }, { $set: { cocOverdueWarnedAt: warnedAt } })
      .exec();
  }

  async findLinkedSupplierDeliveryNotes(): Promise<RubberDeliveryNote[]> {
    const docs = await this.documents
      .find({ status: DeliveryNoteStatus.LINKED, linkedCocId: { $ne: null } })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findAllWithCocLink(): Promise<RubberDeliveryNote[]> {
    const docs = await this.documents
      .find({ linkedCocId: { $ne: null } })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findLinkedCustomerDnsNeedingStatusRepair(
    customerIds: number[],
  ): Promise<RubberDeliveryNote[]> {
    const docs = await this.documents
      .find({
        supplierCompanyId: { $in: customerIds },
        linkedCocId: { $ne: null },
        status: {
          $in: [
            DeliveryNoteStatus.PENDING,
            DeliveryNoteStatus.EXTRACTED,
            DeliveryNoteStatus.STOCK_CREATED,
          ],
        },
      })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findUnlinkedRollDnsByCustomerIds(customerIds: number[]): Promise<RubberDeliveryNote[]> {
    const docs = await this.documents
      .find({
        supplierCompanyId: { $in: customerIds },
        linkedCocId: null,
        deliveryNoteType: DeliveryNoteType.ROLL,
      })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  private async listFilter(filters?: DeliveryNoteListFilters): Promise<Doc> {
    const filter: Doc = {};
    if (!filters?.includeAllVersions) {
      filter.versionStatus = DocumentVersionStatus.ACTIVE;
    }
    if (filters?.deliveryNoteType) {
      filter.deliveryNoteType = filters.deliveryNoteType;
    }
    if (filters?.status) {
      filter.status = filters.status;
    }
    if (filters?.supplierCompanyId) {
      filter.supplierCompanyId = filters.supplierCompanyId;
    }
    if (filters?.companyType) {
      filter.supplierCompanyId = {
        $in: await this.companyIdsByType(filters.companyType),
      };
    }
    return filter;
  }

  private async companyIdsByType(companyType: string): Promise<number[]> {
    const companyModel = this.model.db.model<Doc>("RubberCompany");
    const companies = await companyModel.find({ companyType }).select("_id").lean().exec();
    return companies.map((company) => company._id as number);
  }

  async findOneActiveByNumberAndSupplier(
    deliveryNoteNumber: string,
    supplierCompanyId: number,
  ): Promise<RubberDeliveryNote | null> {
    const doc = await this.documents
      .findOne({
        deliveryNoteNumber: {
          $regex: `^\\s*${escapeRegExp(deliveryNoteNumber.trim())}\\s*$`,
          $options: "i",
        },
        supplierCompanyId,
        versionStatus: DocumentVersionStatus.ACTIVE,
      })
      .lean()
      .exec();
    return this.toDomain(doc);
  }

  async findNewerVersionsByPreviousId(id: number): Promise<RubberDeliveryNote[]> {
    const docs = await this.documents.find({ previousVersionId: id }).lean().exec();
    return this.toDomainList(docs);
  }

  async findAwaitingSignedPod(): Promise<RubberDeliveryNote[]> {
    const docs = await this.documents
      .find({
        requiresSignedPod: true,
        signedPodReceived: { $ne: true },
        versionStatus: DocumentVersionStatus.ACTIVE,
      })
      .populate(["supplierCompany", "linkedCoc"])
      .sort({ createdAt: 1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async repointLinkedCocId(oldId: number, newId: number): Promise<void> {
    await this.documents
      .updateMany({ linkedCocId: oldId }, { $set: { linkedCocId: newId } })
      .exec();
  }

  async findSupplierDnReconciliationRows(
    companyId: number,
  ): Promise<SupplierDnReconciliationRow[]> {
    const rows = await this.documents
      .aggregate<{
        _id: number;
        deliveryNoteNumber: string | null;
        linkedCocId: number | null;
        versionStatus: string;
        activeRank: number;
      }>([
        {
          $match: {
            supplierCompanyId: companyId,
            versionStatus: { $nin: ["REJECTED", "SUPERSEDED"] },
          },
        },
        {
          $addFields: {
            activeRank: {
              $cond: [{ $eq: ["$versionStatus", "ACTIVE"] }, 0, 1],
            },
          },
        },
        { $sort: { activeRank: 1, _id: -1 } },
      ])
      .exec();
    return rows.map((row) => ({
      id: Number(row._id),
      deliveryNoteNumber: row.deliveryNoteNumber == null ? null : String(row.deliveryNoteNumber),
      linkedCocId: row.linkedCocId == null ? null : Number(row.linkedCocId),
      versionStatus: String(row.versionStatus),
    }));
  }

  async findIdsWithRollsButNoItems(): Promise<number[]> {
    const candidates = await this.documents
      .find({ "extractedData.rolls.0": { $exists: true } })
      .select("_id")
      .sort({ _id: 1 })
      .lean()
      .exec();
    const candidateIds = candidates.map((doc) => doc._id as number);
    if (candidateIds.length === 0) {
      return [];
    }
    const itemModel = this.model.db.model<Doc>("RubberDeliveryNoteItem");
    const withItems = await itemModel.distinct("deliveryNoteId", {
      deliveryNoteId: { $in: candidateIds },
    });
    const withItemsSet = new Set(withItems.map((id) => Number(id)));
    return candidateIds.filter((id) => !withItemsSet.has(id));
  }
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { now } from "../../lib/datetime";
import type { DeepPartial } from "../../lib/persistence/crud-repository";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { DocumentVersionStatus } from "../entities/document-version.types";
import {
  RubberTaxInvoice,
  TaxInvoiceStatus,
  TaxInvoiceType,
} from "../entities/rubber-tax-invoice.entity";
import {
  type CompanyStatementRow,
  type EligibleSageInvoiceFilters,
  type ExportableInvoiceFilters,
  RubberTaxInvoiceRepository,
  type TaxInvoiceListFilters,
  type TaxInvoicePage,
  type TaxInvoicePageFilters,
} from "./rubber-tax-invoice.repository";

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

@Injectable()
export class MongoRubberTaxInvoiceRepository
  extends MongoCrudRepository<RubberTaxInvoice>
  implements RubberTaxInvoiceRepository
{
  constructor(@InjectModel("RubberTaxInvoice") model: Model<RubberTaxInvoice>) {
    super(model);
  }

  build(data: Partial<RubberTaxInvoice>): RubberTaxInvoice {
    return data as RubberTaxInvoice;
  }

  async saveMany(entities: RubberTaxInvoice[]): Promise<RubberTaxInvoice[]> {
    return Promise.all(entities.map((entity) => this.save(entity)));
  }

  async deleteById(id: number): Promise<boolean> {
    const result = await this.documents.deleteOne({ _id: id }).exec();
    return result.deletedCount > 0;
  }

  async updateById(id: number, updates: DeepPartial<RubberTaxInvoice>): Promise<void> {
    await this.documents.updateOne({ _id: id }, { $set: updates }).exec();
  }

  async updatePendingToFailed(id: number): Promise<void> {
    await this.documents
      .updateOne(
        { _id: id, status: TaxInvoiceStatus.PENDING },
        { $set: { status: TaxInvoiceStatus.FAILED } },
      )
      .exec();
  }

  async findOneByIdWithCompany(id: number): Promise<RubberTaxInvoice | null> {
    const doc = await this.documents.findById(id).populate("company").lean().exec();
    return this.toDomain(doc);
  }

  async findOneByIdWithCompanyAndOriginal(id: number): Promise<RubberTaxInvoice | null> {
    const doc = await this.documents
      .findById(id)
      .populate(["company", "originalInvoice"])
      .lean()
      .exec();
    return this.toDomain(doc);
  }

  async findManyByIdsWithCompany(ids: number[]): Promise<RubberTaxInvoice[]> {
    const docs = await this.documents
      .find({ _id: { $in: ids } })
      .populate("company")
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findFilteredWithRelations(filters?: TaxInvoiceListFilters): Promise<RubberTaxInvoice[]> {
    const filter: Record<string, unknown> = {};
    if (!filters?.includeAllVersions) {
      filter.versionStatus = DocumentVersionStatus.ACTIVE;
    }
    if (filters?.invoiceType) {
      filter.invoiceType = filters.invoiceType;
    }
    if (filters?.status) {
      filter.status = filters.status;
    }
    if (filters?.companyId) {
      filter.companyId = filters.companyId;
    }
    if (filters?.isCreditNote !== undefined) {
      filter.isCreditNote = filters.isCreditNote;
    }
    const docs = await this.documents
      .find(filter)
      .populate(["company", "originalInvoice"])
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findPaginated(
    filters: TaxInvoicePageFilters,
    _sortColumnMap: Record<string, string>,
  ): Promise<TaxInvoicePage> {
    const page = Math.max(1, filters.page ?? 1);
    const pageSize = Math.max(1, Math.min(200, filters.pageSize ?? 25));
    const skip = (page - 1) * pageSize;

    const filter: Record<string, unknown> = {};
    if (!filters.includeAllVersions) {
      filter.versionStatus = DocumentVersionStatus.ACTIVE;
    }
    if (filters.invoiceType) {
      filter.invoiceType = filters.invoiceType;
    }
    if (filters.status) {
      filter.status = filters.status;
    }
    if (filters.companyId) {
      filter.companyId = filters.companyId;
    }
    if (filters.isCreditNote !== undefined) {
      filter.isCreditNote = filters.isCreditNote;
    }
    if (filters.search) {
      filter.invoiceNumber = { $regex: escapeRegExp(filters.search), $options: "i" };
    }

    const sortDirection = filters.sortDirection === "asc" ? 1 : -1;
    const total = await this.documents.countDocuments(filter).exec();
    const docs = await this.documents
      .find(filter)
      .populate(["company", "originalInvoice"])
      .sort({ createdAt: sortDirection, _id: -1 })
      .skip(skip)
      .limit(pageSize)
      .lean()
      .exec();

    return { items: this.toDomainList(docs), total, page, pageSize };
  }

  async eligibleSageInvoiceIds(filters: EligibleSageInvoiceFilters): Promise<number[]> {
    const filter: Record<string, unknown> = {
      invoiceType: filters.invoiceType,
      status: "APPROVED",
      sageInvoiceId: null,
      isCreditNote: false,
    };
    if (!filters.includeAllVersions) {
      filter.versionStatus = DocumentVersionStatus.ACTIVE;
    }
    if (filters.search) {
      filter.invoiceNumber = { $regex: escapeRegExp(filters.search), $options: "i" };
    }
    const docs = await this.documents.find(filter).select("_id").lean().exec();
    return docs.map((d) => Number(d._id));
  }

  async companyStatementRows(invoiceType: TaxInvoiceType): Promise<CompanyStatementRow[]> {
    const rows = await this.documents
      .aggregate([
        {
          $match: {
            invoiceType,
            versionStatus: DocumentVersionStatus.ACTIVE,
            isCreditNote: false,
          },
        },
        {
          $group: {
            _id: "$companyId",
            invoiceCount: { $sum: 1 },
            total: { $sum: { $toDouble: { $ifNull: ["$totalAmount", 0] } } },
            vatTotal: { $sum: { $toDouble: { $ifNull: ["$vatAmount", 0] } } },
          },
        },
        {
          $lookup: {
            from: "rubbercompanies",
            localField: "_id",
            foreignField: "_id",
            as: "company",
          },
        },
        { $unwind: { path: "$company", preserveNullAndEmptyArrays: true } },
        { $sort: { total: -1 } },
      ])
      .exec();

    return rows.map((r) => ({
      companyId: Number(r._id),
      companyName: r.company?.name ?? "",
      companyCode: r.company?.code ?? null,
      emailConfig: r.company?.emailConfig ?? null,
      invoiceCount: Number(r.invoiceCount),
      total: Number(r.total),
      vatTotal: Number(r.vatTotal),
    }));
  }

  async findExportableInvoices(filters: ExportableInvoiceFilters): Promise<RubberTaxInvoice[]> {
    const filter: Record<string, unknown> = {
      invoiceType: filters.invoiceType,
      status: TaxInvoiceStatus.APPROVED,
    };
    const dateFilter: Record<string, unknown> = {};
    if (filters.dateFrom) {
      dateFilter.$gte = filters.dateFrom;
    }
    if (filters.dateTo) {
      dateFilter.$lte = filters.dateTo;
    }
    if (filters.dateFrom || filters.dateTo) {
      filter.invoiceDate = dateFilter;
    }
    if (filters.excludeExported) {
      filter.exportedToSageAt = null;
    }
    if (filters.invoiceId) {
      filter._id = filters.invoiceId;
    }
    const docs = await this.documents
      .find(filter)
      .populate("company")
      .sort({ invoiceDate: 1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async markExportedToSage(ids: number[]): Promise<void> {
    await this.documents
      .updateMany({ _id: { $in: ids } }, { $set: { exportedToSageAt: now().toJSDate() } })
      .exec();
  }

  async findOneByNormalizedRefAndCompany(
    normalizedRef: string,
    companyId: number,
  ): Promise<RubberTaxInvoice | null> {
    const doc = await this.documents
      .findOne({
        companyId,
        isCreditNote: false,
        $expr: {
          $eq: [
            {
              $replaceAll: {
                input: {
                  $replaceAll: {
                    input: "$invoiceNumber",
                    find: "-",
                    replacement: "",
                  },
                },
                find: " ",
                replacement: "",
              },
            },
            normalizedRef,
          ],
        },
      })
      .lean()
      .exec();
    return this.toDomain(doc);
  }

  async findApprovedSupplierInvoicesInPeriod(
    companyId: number,
    startDate: string,
    endDate: string,
  ): Promise<RubberTaxInvoice[]> {
    const docs = await this.documents
      .find({
        companyId,
        invoiceType: TaxInvoiceType.SUPPLIER,
        status: TaxInvoiceStatus.APPROVED,
        invoiceDate: { $gte: startDate, $lt: endDate },
        versionStatus: "ACTIVE",
      })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findActiveSupplierInvoicesForReconciliation(
    companyId: number,
  ): Promise<RubberTaxInvoice[]> {
    const docs = await this.documents
      .find({
        companyId,
        invoiceType: TaxInvoiceType.SUPPLIER,
        status: { $in: [TaxInvoiceStatus.APPROVED, TaxInvoiceStatus.EXTRACTED] },
        versionStatus: "ACTIVE",
      })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findApprovedInvoicesForPeriod(
    invoiceType: TaxInvoiceType,
    startDate: string,
    endDate: string,
    companyId?: number,
  ): Promise<RubberTaxInvoice[]> {
    const filter: Record<string, unknown> = {
      invoiceType,
      status: TaxInvoiceStatus.APPROVED,
      invoiceDate: { $gte: startDate, $lt: endDate },
      versionStatus: "ACTIVE",
    };
    if (companyId) {
      filter.companyId = companyId;
    }
    const docs = await this.documents
      .find(filter)
      .populate("company")
      .sort({ invoiceDate: 1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findRecentSupplierInvoices(companyId: number, limit: number): Promise<RubberTaxInvoice[]> {
    const docs = await this.documents
      .find({
        companyId,
        invoiceType: TaxInvoiceType.SUPPLIER,
        isCreditNote: false,
      })
      .sort({ invoiceDate: -1 })
      .limit(limit)
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findOneActiveByNumberCompanyAndType(
    invoiceNumber: string,
    companyId: number,
    invoiceType: TaxInvoiceType,
  ): Promise<RubberTaxInvoice | null> {
    const doc = await this.documents
      .findOne({
        invoiceNumber: {
          $regex: `^\\s*${escapeRegExp(invoiceNumber.trim())}\\s*$`,
          $options: "i",
        },
        companyId,
        invoiceType,
        versionStatus: DocumentVersionStatus.ACTIVE,
      })
      .lean()
      .exec();
    return this.toDomain(doc);
  }

  async findNewerVersionsByPreviousId(id: number): Promise<RubberTaxInvoice[]> {
    const docs = await this.documents.find({ previousVersionId: id }).lean().exec();
    return this.toDomainList(docs);
  }
}

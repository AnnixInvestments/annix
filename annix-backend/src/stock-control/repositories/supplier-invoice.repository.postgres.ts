import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import {
  ILike,
  In,
  IsNull,
  LessThan,
  MoreThanOrEqual,
  Repository,
  type DeepPartial as TypeOrmDeepPartial,
} from "typeorm";
import { type QueryDeepPartialEntity } from "typeorm/query-builder/QueryPartialEntity";
import type { DeepPartial } from "../../lib/persistence/crud-repository";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { InvoiceExtractionStatus, SupplierInvoice } from "../entities/supplier-invoice.entity";
import {
  type SageExportInvoiceFilters,
  SupplierInvoiceRepository,
} from "./supplier-invoice.repository";

@Injectable()
export class PostgresSupplierInvoiceRepository
  extends TypeOrmCrudRepository<SupplierInvoice>
  implements SupplierInvoiceRepository
{
  constructor(@InjectRepository(SupplierInvoice) repository: Repository<SupplierInvoice>) {
    super(repository);
  }

  build(data: DeepPartial<SupplierInvoice>): SupplierInvoice {
    return this.repository.create(data as TypeOrmDeepPartial<SupplierInvoice>);
  }

  async updateById(id: number, updates: DeepPartial<SupplierInvoice>): Promise<void> {
    await this.repository.update(id, updates as QueryDeepPartialEntity<SupplierInvoice>);
  }

  async updateManyByIdsForCompany(
    ids: number[],
    companyId: number,
    updates: DeepPartial<SupplierInvoice>,
  ): Promise<void> {
    await this.repository.update(
      { id: In(ids), companyId },
      updates as QueryDeepPartialEntity<SupplierInvoice>,
    );
  }

  findOneById(id: number): Promise<SupplierInvoice | null> {
    return this.repository.findOne({ where: { id } });
  }

  findOneByIdWithRelations(id: number, relations: string[]): Promise<SupplierInvoice | null> {
    return this.repository.findOne({ where: { id }, relations });
  }

  findOneForCompany(id: number, companyId: number): Promise<SupplierInvoice | null> {
    return this.repository.findOne({ where: { id, companyId } });
  }

  findOneForCompanyWithRelations(
    id: number,
    companyId: number,
    relations: string[],
  ): Promise<SupplierInvoice | null> {
    return this.repository.findOne({ where: { id, companyId }, relations });
  }

  findForCompanyWithDeliveryNotePaginated(
    companyId: number,
    page: number,
    limit: number,
    search?: string,
  ): Promise<SupplierInvoice[]> {
    const trimmed = (search ?? "").trim();
    const where =
      trimmed === ""
        ? { companyId }
        : [
            { companyId, invoiceNumber: ILike(`%${trimmed}%`) },
            { companyId, supplierName: ILike(`%${trimmed}%`) },
          ];
    return this.repository.find({
      where,
      relations: ["deliveryNote"],
      order: { createdAt: "DESC" },
      take: limit,
      skip: (page - 1) * limit,
    });
  }

  findStaleProcessingForCompany(companyId: number, threshold: Date): Promise<SupplierInvoice[]> {
    return this.repository.find({
      where: {
        companyId,
        extractionStatus: InvoiceExtractionStatus.PROCESSING,
        updatedAt: LessThan(threshold),
      },
    });
  }

  findFailedForCompany(companyId: number): Promise<SupplierInvoice[]> {
    return this.repository.find({
      where: { companyId, extractionStatus: InvoiceExtractionStatus.FAILED },
    });
  }

  findUnlinkedForCompany(companyId: number): Promise<SupplierInvoice[]> {
    return this.repository.find({
      where: { companyId, deliveryNoteId: IsNull() },
      order: { createdAt: "DESC" },
    });
  }

  countByExtractionStatusForCompany(
    companyId: number,
    status: InvoiceExtractionStatus,
  ): Promise<number> {
    return this.repository.count({ where: { companyId, extractionStatus: status } });
  }

  countByExtractionStatusesForCompany(
    companyId: number,
    statuses: InvoiceExtractionStatus[],
  ): Promise<number> {
    return this.repository.count({
      where: { companyId, extractionStatus: In(statuses) },
    });
  }

  countCompletedSinceForCompany(companyId: number, since: Date): Promise<number> {
    return this.repository.count({
      where: {
        companyId,
        extractionStatus: InvoiceExtractionStatus.COMPLETED,
        createdAt: MoreThanOrEqual(since),
      },
    });
  }

  searchSummaryForCompany(
    companyId: number,
    pattern: string,
    limit: number,
  ): Promise<SupplierInvoice[]> {
    return this.repository
      .createQueryBuilder("inv")
      .select([
        "inv.id",
        "inv.invoiceNumber",
        "inv.supplierName",
        "inv.totalAmount",
        "inv.extractionStatus",
        "inv.updatedAt",
      ])
      .where("inv.companyId = :companyId", { companyId })
      .andWhere("(inv.invoiceNumber ILIKE :pattern OR inv.supplierName ILIKE :pattern)", {
        pattern,
      })
      .orderBy("inv.updatedAt", "DESC")
      .take(limit)
      .getMany();
  }

  findExportableForCompany(
    companyId: number,
    filters: SageExportInvoiceFilters,
  ): Promise<SupplierInvoice[]> {
    const qb = this.repository
      .createQueryBuilder("invoice")
      .leftJoinAndSelect("invoice.items", "item")
      .where("invoice.companyId = :companyId", { companyId })
      .andWhere("invoice.extractionStatus = :status", {
        status: InvoiceExtractionStatus.COMPLETED,
      })
      .andWhere("invoice.approvedBy IS NOT NULL");

    if (filters.dateFrom) {
      qb.andWhere("invoice.invoiceDate >= :dateFrom", { dateFrom: filters.dateFrom });
    }

    if (filters.dateTo) {
      qb.andWhere("invoice.invoiceDate <= :dateTo", { dateTo: filters.dateTo });
    }

    if (filters.excludeExported) {
      qb.andWhere("invoice.exportedToSageAt IS NULL");
    }

    qb.orderBy("invoice.invoiceDate", "ASC");

    return qb.getMany();
  }
}

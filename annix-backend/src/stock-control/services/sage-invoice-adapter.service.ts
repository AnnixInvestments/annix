import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { now } from "../../lib/datetime";
import type { SageExportFilterDto } from "../../sage-export/dto/sage-export.dto";
import type {
  SageExportInvoice,
  SageExportLineItem,
} from "../../sage-export/interfaces/sage-invoice";
import { InvoiceExtractionStatus, SupplierInvoice } from "../entities/supplier-invoice.entity";

const DEFAULT_VAT_RATE = 15;
const DEFAULT_ACCOUNT_CODE = "5000";

@Injectable()
export class SageInvoiceAdapterService {
  constructor(
    @InjectRepository(SupplierInvoice)
    private readonly invoiceRepo: Repository<SupplierInvoice>,
  ) {}

  async exportableInvoices(
    companyId: number,
    filters: SageExportFilterDto,
  ): Promise<{ invoices: SageExportInvoice[]; invoiceIds: number[] }> {
    const qb = this.invoiceRepo
      .createQueryBuilder("invoice")
      .leftJoinAndSelect("invoice.items", "item")
      .where("invoice.companyId = :companyId", { companyId })
      .andWhere("invoice.extractionStatus = :status", { status: InvoiceExtractionStatus.COMPLETED })
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

    const entities = await qb.getMany();

    const invoices = entities.map((entity) => toSageInvoice(entity));
    const invoiceIds = entities.map((entity) => entity.id);

    return { invoices, invoiceIds };
  }

  async markExported(companyId: number, invoiceIds: number[]): Promise<void> {
    if (invoiceIds.length === 0) {
      return;
    }

    await this.invoiceRepo.update(
      { id: In(invoiceIds), companyId },
      { exportedToSageAt: now().toJSDate() },
    );
  }

  async previewCount(
    companyId: number,
    filters: SageExportFilterDto,
  ): Promise<{
    invoiceCount: number;
    lineItemCount: number;
    totalAmount: number;
  }> {
    const { invoices } = await this.exportableInvoices(companyId, filters);

    const lineItemCount = invoices.reduce((sum, inv) => sum + inv.lineItems.length, 0);
    const totalAmount = invoices.reduce((sum, inv) => sum + (inv.totalAmount ?? 0), 0);

    return {
      invoiceCount: invoices.length,
      lineItemCount,
      totalAmount,
    };
  }
}

function toSageInvoice(entity: SupplierInvoice): SageExportInvoice {
  const lineItems: SageExportLineItem[] = (entity.items ?? []).map((item) => ({
    description: item.extractedDescription ?? `Line ${item.lineNumber}`,
    quantity: item.quantity,
    unitPrice: item.unitPrice !== null ? Number(item.unitPrice) : null,
    vatRate: DEFAULT_VAT_RATE,
    accountCode: DEFAULT_ACCOUNT_CODE,
  }));

  return {
    invoiceNumber: entity.invoiceNumber,
    supplierName: entity.supplierName,
    invoiceDate: entity.invoiceDate,
    dueDate: null,
    totalAmount: entity.totalAmount !== null ? Number(entity.totalAmount) : null,
    vatAmount: entity.vatAmount !== null ? Number(entity.vatAmount) : null,
    reference: null,
    lineItems,
  };
}

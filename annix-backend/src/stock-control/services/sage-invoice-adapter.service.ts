import { Injectable, type OnModuleInit } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { now } from "../../lib/datetime";
import type { SageExportFilterDto } from "../../sage-export/dto/sage-export.dto";
import type { SageExportLineItem } from "../../sage-export/interfaces/sage-invoice";
import type {
  SageAdapterContext,
  SageExportPreview,
  SageExportResult,
  SageInvoiceAdapter,
} from "../../sage-export/interfaces/sage-invoice-adapter.interface";
import { SageAdapterRegistry } from "../../sage-export/sage-adapter-registry.service";
import { InvoiceExtractionStatus, SupplierInvoice } from "../entities/supplier-invoice.entity";

const DEFAULT_VAT_RATE = 15;
const DEFAULT_ACCOUNT_CODE = "5000";

@Injectable()
export class SageInvoiceAdapterService implements SageInvoiceAdapter, OnModuleInit {
  constructor(
    @InjectRepository(SupplierInvoice)
    private readonly invoiceRepo: Repository<SupplierInvoice>,
    private readonly sageAdapterRegistry: SageAdapterRegistry,
  ) {}

  onModuleInit() {
    this.sageAdapterRegistry.registerAdapter({
      moduleCode: "stock-control",
      adapterKey: "invoices",
      label: "Stock Control Supplier Invoices",
      adapter: this,
    });
  }

  async exportableInvoices(
    filters: SageExportFilterDto,
    context: SageAdapterContext,
  ): Promise<SageExportResult> {
    const qb = this.invoiceRepo
      .createQueryBuilder("invoice")
      .leftJoinAndSelect("invoice.items", "item")
      .where("invoice.companyId = :companyId", { companyId: context.companyId })
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

    return {
      invoices: entities.map((entity) => toSageInvoice(entity)),
      entityIds: entities.map((entity) => entity.id),
    };
  }

  async markExported(entityIds: number[], context: SageAdapterContext): Promise<void> {
    if (entityIds.length === 0) {
      return;
    }

    await this.invoiceRepo.update(
      { id: In(entityIds), companyId: context.companyId! },
      { exportedToSageAt: now().toJSDate() },
    );
  }

  async previewCount(
    filters: SageExportFilterDto,
    context: SageAdapterContext,
  ): Promise<SageExportPreview> {
    const { invoices } = await this.exportableInvoices(filters, context);

    return {
      count: invoices.length,
      lineItemCount: invoices.reduce((sum, inv) => sum + inv.lineItems.length, 0),
      totalAmount: invoices.reduce((sum, inv) => sum + (inv.totalAmount ?? 0), 0),
    };
  }
}

function toSageInvoice(entity: SupplierInvoice) {
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

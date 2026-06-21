import { Injectable, Logger, type OnModuleInit } from "@nestjs/common";
import { AuditService } from "../../audit/audit.service";
import { AuditAction } from "../../audit/entities/audit-log.entity";
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
import { SupplierInvoice } from "../entities/supplier-invoice.entity";
import { SupplierInvoiceRepository } from "../repositories/supplier-invoice.repository";

const DEFAULT_VAT_RATE = 15;
const DEFAULT_ACCOUNT_CODE = "5000";

@Injectable()
export class SageInvoiceAdapterService implements SageInvoiceAdapter, OnModuleInit {
  private readonly logger = new Logger(SageInvoiceAdapterService.name);

  constructor(
    private readonly invoiceRepo: SupplierInvoiceRepository,
    private readonly sageAdapterRegistry: SageAdapterRegistry,
    private readonly auditService: AuditService,
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
    const entities = await this.invoiceRepo.findExportableForCompany(context.companyId!, {
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo,
      excludeExported: filters.excludeExported,
    });

    return {
      invoices: entities.map((entity) => toSageInvoice(entity)),
      entityIds: entities.map((entity) => entity.id),
    };
  }

  async markExported(entityIds: number[], context: SageAdapterContext): Promise<void> {
    if (entityIds.length === 0) {
      return;
    }

    await this.invoiceRepo.updateManyByIdsForCompany(entityIds, context.companyId!, {
      exportedToSageAt: now().toJSDate(),
    });

    this.auditService
      .log({
        entityType: "supplier_invoice_sage_export",
        entityId: context.companyId ?? 0,
        action: AuditAction.DOWNLOAD,
        newValues: {
          companyId: context.companyId ?? null,
          userId: context.userId ?? null,
          appKey: context.appKey,
          exportedInvoiceIds: entityIds,
          exportedCount: entityIds.length,
        },
      })
      .catch((err) => this.logger.error(`Audit log failed: ${err.message}`, err.stack));
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

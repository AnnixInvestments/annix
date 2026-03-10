import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { now } from "../lib/datetime";
import type { SageExportFilterDto } from "../sage-export/dto/sage-export.dto";
import type { SageExportInvoice, SageExportLineItem } from "../sage-export/interfaces/sage-invoice";
import {
  RubberTaxInvoice,
  TaxInvoiceStatus,
  TaxInvoiceType,
} from "./entities/rubber-tax-invoice.entity";

const DEFAULT_VAT_RATE = 15;
const DEFAULT_ACCOUNT_CODE = "5000";

@Injectable()
export class RubberSageInvoiceAdapterService {
  constructor(
    @InjectRepository(RubberTaxInvoice)
    private readonly invoiceRepo: Repository<RubberTaxInvoice>,
  ) {}

  async exportableInvoices(
    filters: SageExportFilterDto,
  ): Promise<{ invoices: SageExportInvoice[]; invoiceIds: number[] }> {
    const invoiceType = filters.invoiceType === "CUSTOMER"
      ? TaxInvoiceType.CUSTOMER
      : TaxInvoiceType.SUPPLIER;

    const qb = this.invoiceRepo
      .createQueryBuilder("invoice")
      .leftJoinAndSelect("invoice.company", "company")
      .where("invoice.invoice_type = :type", { type: invoiceType })
      .andWhere("invoice.status = :status", { status: TaxInvoiceStatus.APPROVED });

    if (filters.dateFrom) {
      qb.andWhere("invoice.invoice_date >= :dateFrom", { dateFrom: filters.dateFrom });
    }

    if (filters.dateTo) {
      qb.andWhere("invoice.invoice_date <= :dateTo", { dateTo: filters.dateTo });
    }

    if (filters.excludeExported) {
      qb.andWhere("invoice.exported_to_sage_at IS NULL");
    }

    qb.orderBy("invoice.invoice_date", "ASC");

    const entities = await qb.getMany();

    const invoices = entities.map((entity) => toSageInvoice(entity));
    const invoiceIds = entities.map((entity) => entity.id);

    return { invoices, invoiceIds };
  }

  async markExported(invoiceIds: number[]): Promise<void> {
    if (invoiceIds.length === 0) {
      return;
    }

    await this.invoiceRepo
      .createQueryBuilder()
      .update(RubberTaxInvoice)
      .set({ exportedToSageAt: now().toJSDate() } as unknown as RubberTaxInvoice)
      .where({ id: In(invoiceIds) })
      .execute();
  }

  async previewCount(filters: SageExportFilterDto): Promise<{
    invoiceCount: number;
    lineItemCount: number;
    totalAmount: number;
  }> {
    const { invoices } = await this.exportableInvoices(filters);

    const lineItemCount = invoices.reduce((sum, inv) => sum + inv.lineItems.length, 0);
    const totalAmount = invoices.reduce((sum, inv) => sum + (inv.totalAmount ?? 0), 0);

    return {
      invoiceCount: invoices.length,
      lineItemCount,
      totalAmount,
    };
  }
}

function toSageInvoice(entity: RubberTaxInvoice): SageExportInvoice {
  const extractedItems = entity.extractedData?.lineItems ?? [];

  const lineItems: SageExportLineItem[] =
    extractedItems.length > 0
      ? extractedItems.map((item) => ({
          description: item.description,
          quantity: item.quantity ?? 1,
          unitPrice: item.unitPrice ?? item.amount,
          vatRate: DEFAULT_VAT_RATE,
          accountCode: DEFAULT_ACCOUNT_CODE,
        }))
      : [
          {
            description: `Invoice ${entity.invoiceNumber}`,
            quantity: 1,
            unitPrice: entity.totalAmount ? Number(entity.totalAmount) : null,
            vatRate: DEFAULT_VAT_RATE,
            accountCode: DEFAULT_ACCOUNT_CODE,
          },
        ];

  return {
    invoiceNumber: entity.invoiceNumber,
    supplierName: entity.company?.name ?? "Unknown Supplier",
    invoiceDate: entity.invoiceDate,
    dueDate: null,
    totalAmount: entity.totalAmount ? Number(entity.totalAmount) : null,
    vatAmount: entity.vatAmount ? Number(entity.vatAmount) : null,
    reference: null,
    lineItems,
  };
}

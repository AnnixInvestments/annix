import { Injectable, type OnModuleInit } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { now } from "../lib/datetime";
import type { SageExportFilterDto } from "../sage-export/dto/sage-export.dto";
import type { SageExportInvoice, SageExportLineItem } from "../sage-export/interfaces/sage-invoice";
import type {
  SageAdapterContext,
  SageExportPreview,
  SageExportResult,
  SageInvoiceAdapter,
} from "../sage-export/interfaces/sage-invoice-adapter.interface";
import { SageAdapterRegistry } from "../sage-export/sage-adapter-registry.service";
import { CocProcessingStatus, RubberSupplierCoc } from "./entities/rubber-supplier-coc.entity";

const DEFAULT_VAT_RATE = 15;
const DEFAULT_ACCOUNT_CODE = "5000";

@Injectable()
export class RubberSageCocAdapterService implements SageInvoiceAdapter, OnModuleInit {
  constructor(
    @InjectRepository(RubberSupplierCoc)
    private readonly cocRepo: Repository<RubberSupplierCoc>,
    private readonly sageAdapterRegistry: SageAdapterRegistry,
  ) {}

  onModuleInit() {
    this.sageAdapterRegistry.registerAdapter({
      moduleCode: "au-rubber",
      adapterKey: "cocs",
      label: "AU Rubber Supplier CoCs",
      adapter: this,
    });
  }

  async exportableInvoices(
    filters: SageExportFilterDto,
    _context: SageAdapterContext,
  ): Promise<SageExportResult> {
    const { invoices, cocIds } = await this.exportableCocs(filters);
    return { invoices, entityIds: cocIds };
  }

  async markExported(entityIds: number[], _context: SageAdapterContext): Promise<void> {
    return this.markCocExported(entityIds);
  }

  async previewCount(
    filters: SageExportFilterDto,
    _context: SageAdapterContext,
  ): Promise<SageExportPreview> {
    const { invoices } = await this.exportableCocs(filters);
    return {
      count: invoices.length,
      lineItemCount: invoices.reduce((sum, inv) => sum + inv.lineItems.length, 0),
      totalAmount: invoices.reduce((sum, inv) => sum + (inv.totalAmount ?? 0), 0),
    };
  }

  async exportableCocs(
    filters: SageExportFilterDto,
  ): Promise<{ invoices: SageExportInvoice[]; cocIds: number[] }> {
    const qb = this.cocRepo
      .createQueryBuilder("coc")
      .leftJoinAndSelect("coc.supplierCompany", "company")
      .where("coc.processing_status IN (:...statuses)", {
        statuses: [CocProcessingStatus.EXTRACTED, CocProcessingStatus.APPROVED],
      });

    if (filters.dateFrom) {
      qb.andWhere("coc.created_at >= :dateFrom", { dateFrom: filters.dateFrom });
    }

    if (filters.dateTo) {
      qb.andWhere("coc.created_at <= :dateTo", { dateTo: filters.dateTo });
    }

    if (filters.excludeExported) {
      qb.andWhere("coc.exported_to_sage_at IS NULL");
    }

    qb.orderBy("coc.created_at", "ASC");

    const entities = await qb.getMany();

    const invoices = entities.map((entity) => toSageInvoice(entity));
    const cocIds = entities.map((entity) => entity.id);

    return { invoices, cocIds };
  }

  async markCocExported(cocIds: number[]): Promise<void> {
    if (cocIds.length === 0) {
      return;
    }

    await this.cocRepo
      .createQueryBuilder()
      .update(RubberSupplierCoc)
      .set({ exportedToSageAt: now().toJSDate() } as unknown as RubberSupplierCoc)
      .where({ id: In(cocIds) })
      .execute();
  }

  async cocPreviewCount(filters: SageExportFilterDto): Promise<{
    cocCount: number;
    batchCount: number;
    totalBatches: number;
  }> {
    const { invoices } = await this.exportableCocs(filters);

    const batchCount = invoices.reduce((sum, inv) => sum + inv.lineItems.length, 0);

    return {
      cocCount: invoices.length,
      batchCount,
      totalBatches: batchCount,
    };
  }
}

function toSageInvoice(entity: RubberSupplierCoc): SageExportInvoice {
  const batchNumbers: string[] =
    ((entity.extractedData as Record<string, unknown> | null)?.batchNumbers as string[]) ?? [];

  const lineItems: SageExportLineItem[] =
    batchNumbers.length > 0
      ? batchNumbers.map((batch) => ({
          description: `${entity.compoundCode ?? "Unknown"} - Batch ${batch}`,
          quantity: 1,
          unitPrice: null,
          vatRate: DEFAULT_VAT_RATE,
          accountCode: DEFAULT_ACCOUNT_CODE,
        }))
      : [
          {
            description: `CoC ${entity.cocNumber ?? String(entity.id)} - ${entity.compoundCode ?? "Unknown"}`,
            quantity: 1,
            unitPrice: null,
            vatRate: DEFAULT_VAT_RATE,
            accountCode: DEFAULT_ACCOUNT_CODE,
          },
        ];

  return {
    invoiceNumber: entity.cocNumber ?? `COC-${entity.id}`,
    supplierName: entity.supplierCompany?.name ?? "Unknown Supplier",
    invoiceDate: entity.productionDate,
    dueDate: null,
    totalAmount: null,
    vatAmount: null,
    reference: entity.orderNumber,
    lineItems,
  };
}

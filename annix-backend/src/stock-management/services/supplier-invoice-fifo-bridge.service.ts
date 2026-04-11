import { Injectable, Logger } from "@nestjs/common";
import { fromJSDate, now } from "../../lib/datetime";
import { FifoBatchService } from "./fifo-batch.service";
import { IssuableProductService } from "./issuable-product.service";

export interface SupplierInvoiceLineForFifo {
  legacyStockItemId: number | null;
  supplierName: string | null;
  supplierBatchRef: string | null;
  quantity: number;
  unitCost: number;
  receivedAt?: Date | null;
  supplierInvoiceId?: number | null;
}

@Injectable()
export class SupplierInvoiceFifoBridgeService {
  private readonly logger = new Logger(SupplierInvoiceFifoBridgeService.name);

  constructor(
    private readonly fifoBatchService: FifoBatchService,
    private readonly issuableProductService: IssuableProductService,
  ) {}

  async createBatchFromInvoiceLine(
    companyId: number,
    line: SupplierInvoiceLineForFifo,
  ): Promise<{ created: boolean; batchId: number | null; reason?: string }> {
    if (line.quantity <= 0 || line.unitCost < 0) {
      return { created: false, batchId: null, reason: "invalid quantity or cost" };
    }
    if (line.legacyStockItemId === null) {
      return { created: false, batchId: null, reason: "no legacy stock item id" };
    }
    const product = await this.issuableProductService.findByLegacyStockItemId(
      companyId,
      line.legacyStockItemId,
    );
    if (!product) {
      this.logger.warn(
        `No IssuableProduct mapped for legacy stock_item_id ${line.legacyStockItemId} (company ${companyId})`,
      );
      return {
        created: false,
        batchId: null,
        reason: `no IssuableProduct found for legacy_stock_item_id=${line.legacyStockItemId}`,
      };
    }
    const receivedAt = line.receivedAt ?? now().toJSDate();
    const batch = await this.fifoBatchService.createBatch(companyId, {
      productId: product.id,
      sourceType: "supplier_invoice",
      sourceRefId: line.supplierInvoiceId ?? null,
      supplierName: line.supplierName,
      supplierBatchRef: line.supplierBatchRef,
      quantityPurchased: line.quantity,
      costPerUnit: line.unitCost,
      receivedAt,
      isLegacyBatch: false,
      notes: `Created from supplier invoice ${line.supplierInvoiceId ?? "?"} on ${formatJsDate(receivedAt)}`,
    });
    this.logger.log(
      `Created FIFO batch ${batch.id} for product ${product.id} (legacy_stock_item_id=${line.legacyStockItemId})`,
    );
    return { created: true, batchId: batch.id };
  }

  async createBatchesFromInvoice(
    companyId: number,
    lines: ReadonlyArray<SupplierInvoiceLineForFifo>,
  ): Promise<{ created: number; skipped: number; errors: string[] }> {
    let created = 0;
    let skipped = 0;
    const errors: string[] = [];
    for (const line of lines) {
      try {
        const result = await this.createBatchFromInvoiceLine(companyId, line);
        if (result.created) {
          created += 1;
        } else {
          skipped += 1;
          if (result.reason) errors.push(result.reason);
        }
      } catch (err) {
        skipped += 1;
        errors.push(err instanceof Error ? err.message : String(err));
      }
    }
    return { created, skipped, errors };
  }
}

function formatJsDate(date: Date): string {
  return fromJSDate(date).toFormat("yyyy-MM-dd");
}

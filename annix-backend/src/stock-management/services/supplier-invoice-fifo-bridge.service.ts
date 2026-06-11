import { Injectable, Logger } from "@nestjs/common";
import { fromJSDate, now } from "../../lib/datetime";
import type { StockPurchaseBatch } from "../entities/stock-purchase-batch.entity";
import { StockMovementBatchConsumptionRepository } from "../repositories/stock-movement-batch-consumption.repository";
import { StockPurchaseBatchRepository } from "../repositories/stock-purchase-batch.repository";
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

export interface DeliveryReceiptLineForFifo {
  legacyStockItemId: number;
  quantity: number;
  deliveryNoteId: number;
  supplierName: string | null;
  receivedAt?: Date | null;
}

@Injectable()
export class SupplierInvoiceFifoBridgeService {
  private readonly logger = new Logger(SupplierInvoiceFifoBridgeService.name);

  constructor(
    private readonly fifoBatchService: FifoBatchService,
    private readonly issuableProductService: IssuableProductService,
    private readonly batchRepo: StockPurchaseBatchRepository,
    private readonly consumptionRepo: StockMovementBatchConsumptionRepository,
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
    await this.issuableProductService.adjustQuantity(companyId, product.id, line.quantity);
    this.logger.log(
      `Created FIFO batch ${batch.id} for product ${product.id} (legacy_stock_item_id=${line.legacyStockItemId})`,
    );
    return { created: true, batchId: batch.id };
  }

  async receiveOrReconcileInvoiceLine(
    companyId: number,
    line: SupplierInvoiceLineForFifo,
    deliveryNoteIds: number[],
  ): Promise<{ created: boolean; reconciled: number; batchId: number | null; reason?: string }> {
    if (line.quantity <= 0 || line.unitCost < 0) {
      return { created: false, reconciled: 0, batchId: null, reason: "invalid quantity or cost" };
    }
    if (line.legacyStockItemId === null) {
      return { created: false, reconciled: 0, batchId: null, reason: "no legacy stock item id" };
    }

    if (deliveryNoteIds.length > 0) {
      const product = await this.issuableProductService.findByLegacyStockItemId(
        companyId,
        line.legacyStockItemId,
      );
      if (product) {
        const grnBatches = (
          await this.batchRepo.findBySourceRefs(companyId, "grn", deliveryNoteIds)
        ).filter((batch) => batch.productId === product.id && !batch.reconciledInvoiceId);

        if (grnBatches.length > 0) {
          await grnBatches.reduce(async (prev, batch) => {
            await prev;
            await this.reconcileBatchCost(companyId, batch, line.unitCost, line.supplierInvoiceId);
          }, Promise.resolve());
          const batchedQuantity = grnBatches.reduce(
            (sum, batch) => sum + Number(batch.quantityPurchased || 0),
            0,
          );
          if (batchedQuantity < line.quantity) {
            this.logger.warn(
              `Invoice ${line.supplierInvoiceId ?? "?"} line for product ${product.id}: invoiced quantity ${line.quantity} exceeds delivery-batched quantity ${batchedQuantity}`,
            );
          }
          return { created: false, reconciled: grnBatches.length, batchId: null };
        }
      }
    }

    const createResult = await this.createBatchFromInvoiceLine(companyId, line);
    return { ...createResult, reconciled: 0 };
  }

  private async reconcileBatchCost(
    companyId: number,
    batch: StockPurchaseBatch,
    unitCost: number,
    invoiceId: number | null | undefined,
  ): Promise<void> {
    batch.costPerUnit = unitCost;
    batch.totalCostR = roundCurrency(Number(batch.quantityPurchased || 0) * unitCost);
    batch.reconciledInvoiceId = invoiceId ?? null;
    batch.notes = appendNote(
      batch.notes,
      `Cost reconciled from supplier invoice ${invoiceId ?? "?"}`,
    );
    await this.batchRepo.save(batch);

    const consumptions = await this.consumptionRepo.findByPurchaseBatch(companyId, batch.id);
    await consumptions.reduce(async (prev, consumption) => {
      await prev;
      consumption.costPerUnitAtConsumption = unitCost;
      consumption.totalCostConsumedR = roundCurrency(
        Number(consumption.quantityConsumed || 0) * unitCost,
      );
      await this.consumptionRepo.save(consumption);
    }, Promise.resolve());

    this.logger.log(
      `Reconciled batch ${batch.id} to cost ${unitCost} from invoice ${invoiceId ?? "?"} (${consumptions.length} consumption(s) re-costed)`,
    );
  }

  async createBatchesFromInvoice(
    companyId: number,
    lines: ReadonlyArray<SupplierInvoiceLineForFifo>,
    deliveryNoteIds: number[] = [],
  ): Promise<{ created: number; reconciled: number; skipped: number; errors: string[] }> {
    let created = 0;
    let reconciled = 0;
    let skipped = 0;
    const errors: string[] = [];
    for (const line of lines) {
      try {
        const result = await this.receiveOrReconcileInvoiceLine(companyId, line, deliveryNoteIds);
        if (result.created) {
          created += 1;
        } else if (result.reconciled > 0) {
          reconciled += result.reconciled;
        } else {
          skipped += 1;
          if (result.reason) errors.push(result.reason);
        }
      } catch (err) {
        skipped += 1;
        errors.push(err instanceof Error ? err.message : String(err));
      }
    }
    return { created, reconciled, skipped, errors };
  }

  async createBatchFromDeliveryLine(
    companyId: number,
    line: DeliveryReceiptLineForFifo,
  ): Promise<{ created: boolean; batchId: number | null; reason?: string }> {
    if (line.quantity <= 0) {
      return { created: false, batchId: null, reason: "invalid quantity" };
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

    const existingForDelivery = await this.batchRepo.findBySourceRefs(companyId, "grn", [
      line.deliveryNoteId,
    ]);
    if (existingForDelivery.some((batch) => batch.productId === product.id)) {
      return {
        created: false,
        batchId: null,
        reason: `delivery note ${line.deliveryNoteId} already batched for product ${product.id}`,
      };
    }

    const receivedAt = line.receivedAt ?? now().toJSDate();
    const provisionalCost = Number(product.costPerUnit) || 0;
    const batch = await this.fifoBatchService.createBatch(companyId, {
      productId: product.id,
      sourceType: "grn",
      sourceRefId: line.deliveryNoteId,
      supplierName: line.supplierName,
      quantityPurchased: line.quantity,
      costPerUnit: provisionalCost,
      receivedAt,
      isLegacyBatch: false,
      notes: `Created from delivery note ${line.deliveryNoteId} on ${formatJsDate(receivedAt)} at provisional cost — awaiting supplier invoice`,
    });
    await this.issuableProductService.adjustQuantity(companyId, product.id, line.quantity);
    this.logger.log(
      `Created provisional FIFO batch ${batch.id} for product ${product.id} from delivery note ${line.deliveryNoteId}`,
    );
    return { created: true, batchId: batch.id };
  }

  async createBatchesFromDelivery(
    companyId: number,
    lines: ReadonlyArray<DeliveryReceiptLineForFifo>,
  ): Promise<{ created: number; skipped: number; errors: string[] }> {
    let created = 0;
    let skipped = 0;
    const errors: string[] = [];
    for (const line of lines) {
      try {
        const result = await this.createBatchFromDeliveryLine(companyId, line);
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

  async voidDeliveryBatches(companyId: number, deliveryNoteId: number): Promise<number> {
    const batches = await this.batchRepo.findBySourceRefs(companyId, "grn", [deliveryNoteId]);
    const activeBatches = batches.filter((batch) => batch.status === "active");

    await activeBatches.reduce(async (prev, batch) => {
      await prev;
      const remaining = Number(batch.quantityRemaining) || 0;
      if (remaining > 0) {
        await this.issuableProductService.adjustQuantity(companyId, batch.productId, -remaining);
      }
      batch.quantityRemaining = 0;
      batch.status = "written_off";
      batch.notes = appendNote(
        batch.notes,
        `Delivery note ${deliveryNoteId} deleted — written off`,
      );
      await this.batchRepo.save(batch);
    }, Promise.resolve());

    if (activeBatches.length > 0) {
      this.logger.log(
        `Wrote off ${activeBatches.length} FIFO batch(es) for deleted delivery note ${deliveryNoteId}`,
      );
    }
    return activeBatches.length;
  }
}

function formatJsDate(date: Date): string {
  return fromJSDate(date).toFormat("yyyy-MM-dd");
}

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

function appendNote(existing: string | null | undefined, addition: string): string {
  return [existing, addition].filter(Boolean).join(" | ");
}

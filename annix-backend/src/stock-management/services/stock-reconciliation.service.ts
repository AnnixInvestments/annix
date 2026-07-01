import { Injectable } from "@nestjs/common";
import { StockItemRepository } from "../../stock-control/repositories/stock-item.repository";
import { IssuableProductRepository } from "../repositories/issuable-product.repository";
import { StockPurchaseBatchRepository } from "../repositories/stock-purchase-batch.repository";

export interface StockDivergenceItem {
  productId: number;
  sku: string;
  name: string;
  legacyStockItemId: number | null;
  legacyQty: number | null;
  newQty: number;
  fifoAvailable: number;
  diffNewMinusLegacy: number | null;
  direction: "LEGACY_HIGHER" | "NEW_HIGHER" | null;
  cacheInvariantOk: boolean;
}

export interface StockDivergenceReport {
  companyId: number;
  summary: {
    totalActive: number;
    diverging: number;
    legacyHigher: number;
    newHigher: number;
    cacheInvariantViolations: number;
    negativeOnHand: number;
  };
  diverging: StockDivergenceItem[];
  cacheInvariantViolations: StockDivergenceItem[];
}

const round3 = (n: number): number => Math.round((n + Number.EPSILON) * 1000) / 1000;

/**
 * Phase-0 observability for the legacy/stock-management on-hand drift: reports,
 * read-only, where the new stock-management FIFO on-hand diverges from the
 * legacy `stock_items.quantity`, and where the new system disagrees with itself
 * (IssuableProduct.quantity cache != Σ active FIFO batch quantityRemaining).
 * Makes no writes — a monitoring/reconciliation aid, not a fixer.
 */
@Injectable()
export class StockReconciliationService {
  constructor(
    private readonly productRepo: IssuableProductRepository,
    private readonly batchRepo: StockPurchaseBatchRepository,
    private readonly stockItemRepo: StockItemRepository,
  ) {}

  async divergenceReport(companyId: number): Promise<StockDivergenceReport> {
    const products = await this.productRepo.findActiveForCompany(companyId);

    const availRows = await this.batchRepo.activeQuantityByProductForCompany(companyId);
    const availMap = new Map(availRows.map((r) => [r.productId, r.available]));

    const legacyIds = products
      .map((p) => p.legacyStockItemId)
      .filter((x): x is number => x != null);
    const legacyItems = legacyIds.length
      ? await this.stockItemRepo.findByIdsForCompanyOrderedByName(legacyIds, companyId)
      : [];
    const legacyMap = new Map(legacyItems.map((s) => [s.id, Number(s.quantity ?? 0)]));

    const items: StockDivergenceItem[] = products.map((p) => {
      const newQty = round3(Number(p.quantity ?? 0));
      const fifoAvailable = round3(Number(availMap.get(p.id) ?? 0));
      const legacyQty =
        p.legacyStockItemId != null && legacyMap.has(p.legacyStockItemId)
          ? round3(legacyMap.get(p.legacyStockItemId) as number)
          : null;
      const diffNewMinusLegacy = legacyQty == null ? null : round3(newQty - legacyQty);
      const direction =
        diffNewMinusLegacy == null || diffNewMinusLegacy === 0
          ? null
          : diffNewMinusLegacy < 0
            ? ("LEGACY_HIGHER" as const)
            : ("NEW_HIGHER" as const);
      return {
        productId: p.id,
        sku: p.sku,
        name: p.name,
        legacyStockItemId: p.legacyStockItemId ?? null,
        legacyQty,
        newQty,
        fifoAvailable,
        diffNewMinusLegacy,
        direction,
        cacheInvariantOk: Math.abs(newQty - fifoAvailable) < 0.001,
      };
    });

    const diverging = items
      .filter((i) => i.direction != null)
      .sort((a, b) => Math.abs(b.diffNewMinusLegacy ?? 0) - Math.abs(a.diffNewMinusLegacy ?? 0));
    const cacheInvariantViolations = items.filter((i) => !i.cacheInvariantOk);

    return {
      companyId,
      summary: {
        totalActive: products.length,
        diverging: diverging.length,
        legacyHigher: diverging.filter((i) => i.direction === "LEGACY_HIGHER").length,
        newHigher: diverging.filter((i) => i.direction === "NEW_HIGHER").length,
        cacheInvariantViolations: cacheInvariantViolations.length,
        negativeOnHand: items.filter((i) => i.newQty < 0).length,
      },
      diverging,
      cacheInvariantViolations,
    };
  }
}

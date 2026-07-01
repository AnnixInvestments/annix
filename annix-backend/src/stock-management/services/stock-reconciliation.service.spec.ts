import { StockReconciliationService } from "./stock-reconciliation.service";

describe("StockReconciliationService.divergenceReport", () => {
  const build = (opts: {
    products: Array<{
      id: number;
      sku: string;
      name: string;
      quantity: number;
      legacyStockItemId: number | null;
    }>;
    fifo: Array<{ productId: number; available: number }>;
    legacy: Array<{ id: number; quantity: number }>;
  }) => {
    const productRepo = { findActiveForCompany: jest.fn().mockResolvedValue(opts.products) };
    const batchRepo = {
      activeQuantityByProductForCompany: jest.fn().mockResolvedValue(opts.fifo),
    };
    const stockItemRepo = {
      findByIdsForCompanyOrderedByName: jest.fn().mockResolvedValue(opts.legacy),
    };
    return new StockReconciliationService(
      productRepo as never,
      batchRepo as never,
      stockItemRepo as never,
    );
  };

  it("classifies legacy-higher, new-higher and in-sync items and flags cache-invariant breaks", async () => {
    const svc = build({
      products: [
        { id: 239, sku: "DDM-001", name: "DUST MASK", quantity: 0, legacyStockItemId: 16 }, // legacy higher
        { id: 106, sku: "RR-225MM", name: "ROLLER", quantity: 45, legacyStockItemId: 20 }, // in sync
        { id: 500, sku: "PAINT", name: "PAINT", quantity: 30, legacyStockItemId: 21 }, // new higher
        { id: 900, sku: "CACHE", name: "CACHE BUG", quantity: 42, legacyStockItemId: 22 }, // cache mismatch
      ],
      fifo: [
        { productId: 106, available: 45 },
        { productId: 500, available: 30 },
        { productId: 900, available: 15 }, // != product.quantity 42 -> invariant break
      ],
      legacy: [
        { id: 16, quantity: 152 },
        { id: 20, quantity: 45 },
        { id: 21, quantity: 23 },
        { id: 22, quantity: 42 },
      ],
    });

    const report = await svc.divergenceReport(1);

    expect(report.summary.totalActive).toBe(4);
    expect(report.summary.diverging).toBe(2); // DDM (legacy higher) + PAINT (new higher)
    expect(report.summary.legacyHigher).toBe(1);
    expect(report.summary.newHigher).toBe(1);
    expect(report.summary.cacheInvariantViolations).toBe(1);

    const ddm = report.diverging.find((i) => i.sku === "DDM-001");
    expect(ddm?.direction).toBe("LEGACY_HIGHER");
    expect(ddm?.diffNewMinusLegacy).toBe(-152);

    const cache = report.cacheInvariantViolations.find((i) => i.sku === "CACHE");
    expect(cache?.newQty).toBe(42);
    expect(cache?.fifoAvailable).toBe(15);
    expect(cache?.cacheInvariantOk).toBe(false);
  });
});

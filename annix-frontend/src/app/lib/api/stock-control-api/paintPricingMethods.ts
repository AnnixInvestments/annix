import { StockControlApiClient } from "./base";
import type {
  CoatingSystemOption,
  CommitPaintPriceListImportInput,
  CreatePaintPriceListItemInput,
  MultiCoatQuoteInput,
  MultiCoatQuoteResult,
  PackOptionRequestItem,
  PackOptionResult,
  PaintPriceListImportPreview,
  PaintPriceListItem,
  PaintPricingConfig,
  PaintPricingResponse,
  PaintQuoteInput,
  PaintQuoteResult,
  PreferredPaintOption,
  QuoteCatalogItem,
} from "./types";

declare module "./base" {
  interface StockControlApiClient {
    paintPricing(): Promise<PaintPricingResponse>;
    preferredPaints(): Promise<PreferredPaintOption[]>;
    paintQuoteCatalog(): Promise<QuoteCatalogItem[]>;
    paintCoatingSystems(): Promise<CoatingSystemOption[]>;
    paintQuote(input: PaintQuoteInput): Promise<PaintQuoteResult>;
    paintMultiCoatQuote(input: MultiCoatQuoteInput): Promise<MultiCoatQuoteResult>;
    paintPackOptions(items: PackOptionRequestItem[]): Promise<PackOptionResult[]>;
    createPaintPriceItem(input: CreatePaintPriceListItemInput): Promise<PaintPriceListItem>;
    updatePaintPriceItem(
      id: number,
      input: Partial<CreatePaintPriceListItemInput>,
    ): Promise<PaintPriceListItem>;
    deletePaintPriceItem(id: number): Promise<{ success: true }>;
    updatePaintPricingConfig(config: PaintPricingConfig): Promise<PaintPricingConfig>;
    importPaintPriceList(file: File): Promise<PaintPriceListImportPreview>;
    commitPaintPriceListImport(
      input: CommitPaintPriceListImportInput,
    ): Promise<{ imported: number }>;
    enrichPaintPriceSpecs(): Promise<{
      enriched: number;
      checked: number;
      unfilled: { productName: string; supplierName: string; missing: string[] }[];
    }>;
    bulkUpliftPaintPrices(upliftPercent: number): Promise<{ updated: number }>;
  }
}

const proto = StockControlApiClient.prototype;

proto.paintPricing = async function () {
  return this.request("/stock-control/paint-pricing");
};

proto.preferredPaints = async function () {
  return this.request("/stock-control/paint-pricing/preferred");
};

proto.paintQuoteCatalog = async function () {
  return this.request("/stock-control/paint-pricing/quote/catalog");
};

proto.paintCoatingSystems = async function () {
  return this.request("/stock-control/paint-pricing/coating-systems");
};

proto.paintQuote = async function (input) {
  return this.request("/stock-control/paint-pricing/quote", {
    method: "POST",
    body: JSON.stringify(input),
  });
};

proto.paintMultiCoatQuote = async function (input) {
  return this.request("/stock-control/paint-pricing/quote/multi-coat", {
    method: "POST",
    body: JSON.stringify(input),
  });
};

proto.paintPackOptions = async function (items) {
  return this.request("/stock-control/paint-pricing/pack-options", {
    method: "POST",
    body: JSON.stringify({ items }),
  });
};

proto.createPaintPriceItem = async function (input) {
  return this.request("/stock-control/paint-pricing", {
    method: "POST",
    body: JSON.stringify(input),
  });
};

proto.updatePaintPriceItem = async function (id, input) {
  return this.request(`/stock-control/paint-pricing/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
};

proto.deletePaintPriceItem = async function (id) {
  return this.request(`/stock-control/paint-pricing/${id}`, { method: "DELETE" });
};

proto.updatePaintPricingConfig = async function (config) {
  return this.request("/stock-control/paint-pricing/config", {
    method: "PUT",
    body: JSON.stringify(config),
  });
};

proto.importPaintPriceList = async function (file) {
  return this.uploadFile("/stock-control/paint-pricing/import", file);
};

proto.commitPaintPriceListImport = async function (input) {
  return this.request("/stock-control/paint-pricing/import/commit", {
    method: "POST",
    body: JSON.stringify(input),
  });
};

proto.enrichPaintPriceSpecs = async function () {
  return this.request("/stock-control/paint-pricing/enrich", { method: "POST" });
};

proto.bulkUpliftPaintPrices = async function (upliftPercent) {
  return this.request("/stock-control/paint-pricing/bulk-uplift", {
    method: "POST",
    body: JSON.stringify({ upliftPercent }),
  });
};

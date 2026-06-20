import { StockControlApiClient } from "./base";
import type {
  CommitRubberPriceListImportInput,
  CreateRubberPriceListItemInput,
  RubberPriceFamily,
  RubberPriceListImportPreview,
  RubberPriceListItem,
  RubberPricingConfig,
  RubberPricingResponse,
  RubberQuoteCatalogItem,
  RubberQuoteInput,
  RubberQuoteResult,
  UpdateRubberPriceListItemInput,
} from "./types";

declare module "./base" {
  interface StockControlApiClient {
    rubberPricing(): Promise<RubberPricingResponse>;
    rubberQuoteCatalog(family: RubberPriceFamily | null): Promise<RubberQuoteCatalogItem[]>;
    rubberQuote(input: RubberQuoteInput): Promise<RubberQuoteResult>;
    createRubberPriceItem(input: CreateRubberPriceListItemInput): Promise<RubberPriceListItem>;
    updateRubberPriceItem(
      id: number,
      input: UpdateRubberPriceListItemInput,
    ): Promise<RubberPriceListItem>;
    deleteRubberPriceItem(id: number): Promise<{ success: true }>;
    updateRubberPricingConfig(config: RubberPricingConfig): Promise<RubberPricingConfig>;
    bulkUpliftRubberPrices(upliftPercent: number): Promise<{ updated: number }>;
    seedRubberPriceList(): Promise<{ seeded: number }>;
    clearRubberPriceList(): Promise<{ cleared: number }>;
    importRubberPriceList(file: File): Promise<RubberPriceListImportPreview>;
    commitRubberPriceListImport(
      input: CommitRubberPriceListImportInput,
    ): Promise<{ imported: number }>;
  }
}

const proto = StockControlApiClient.prototype;

proto.rubberPricing = async function () {
  return this.request("/stock-control/rubber-pricing");
};

proto.rubberQuoteCatalog = async function (family) {
  const suffix = family ? `?family=${encodeURIComponent(family)}` : "";
  return this.request(`/stock-control/rubber-pricing/quote/catalog${suffix}`);
};

proto.rubberQuote = async function (input) {
  return this.request("/stock-control/rubber-pricing/quote", {
    method: "POST",
    body: JSON.stringify(input),
  });
};

proto.createRubberPriceItem = async function (input) {
  return this.request("/stock-control/rubber-pricing", {
    method: "POST",
    body: JSON.stringify(input),
  });
};

proto.updateRubberPriceItem = async function (id, input) {
  return this.request(`/stock-control/rubber-pricing/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
};

proto.deleteRubberPriceItem = async function (id) {
  return this.request(`/stock-control/rubber-pricing/${id}`, { method: "DELETE" });
};

proto.updateRubberPricingConfig = async function (config) {
  return this.request("/stock-control/rubber-pricing/config", {
    method: "PUT",
    body: JSON.stringify(config),
  });
};

proto.bulkUpliftRubberPrices = async function (upliftPercent) {
  return this.request("/stock-control/rubber-pricing/bulk-uplift", {
    method: "POST",
    body: JSON.stringify({ upliftPercent }),
  });
};

proto.clearRubberPriceList = async function () {
  return this.request("/stock-control/rubber-pricing/clear", { method: "POST" });
};

proto.seedRubberPriceList = async function () {
  return this.request("/stock-control/rubber-pricing/seed", { method: "POST" });
};

proto.importRubberPriceList = async function (file) {
  return this.uploadFile("/stock-control/rubber-pricing/import", file);
};

proto.commitRubberPriceListImport = async function (input) {
  return this.request("/stock-control/rubber-pricing/import/commit", {
    method: "POST",
    body: JSON.stringify(input),
  });
};

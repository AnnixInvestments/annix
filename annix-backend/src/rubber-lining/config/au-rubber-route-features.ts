import { AU_RUBBER_FEATURES } from "./au-rubber-licensing";

const ROUTE_CLUSTER_FEATURES: Record<string, string> = {
  "au-cocs": AU_RUBBER_FEATURES.COC_COMPLIANCE,
  "supplier-cocs": AU_RUBBER_FEATURES.COC_COMPLIANCE,
  accounting: AU_RUBBER_FEATURES.ACCOUNTING_RECON,
  "supplier-statements": AU_RUBBER_FEATURES.ACCOUNTING_RECON,
  sage: AU_RUBBER_FEATURES.SAGE_EXPORT,
  "quality-tracking": AU_RUBBER_FEATURES.QUALITY_TRACEABILITY,
  "quality-configs": AU_RUBBER_FEATURES.QUALITY_TRACEABILITY,
  "quality-alerts": AU_RUBBER_FEATURES.QUALITY_TRACEABILITY,
  "compound-batches": AU_RUBBER_FEATURES.QUALITY_TRACEABILITY,
  "roll-issuances": AU_RUBBER_FEATURES.QUALITY_TRACEABILITY,
  "roll-rejections": AU_RUBBER_FEATURES.QUALITY_TRACEABILITY,
  "tax-invoices": AU_RUBBER_FEATURES.INVOICING_TAX,
  "pricing-tiers": AU_RUBBER_FEATURES.INVOICING_TAX,
  "cost-rates": AU_RUBBER_FEATURES.INVOICING_TAX,
  "roll-cos": AU_RUBBER_FEATURES.INVOICING_TAX,
  "roll-stock": AU_RUBBER_FEATURES.STOCK_PRODUCTION,
  "roll-stock-statuses": AU_RUBBER_FEATURES.STOCK_PRODUCTION,
  "compound-stocks": AU_RUBBER_FEATURES.STOCK_PRODUCTION,
  "compound-movements": AU_RUBBER_FEATURES.STOCK_PRODUCTION,
  "compound-orders": AU_RUBBER_FEATURES.STOCK_PRODUCTION,
  "stock-locations": AU_RUBBER_FEATURES.STOCK_PRODUCTION,
  "other-stocks": AU_RUBBER_FEATURES.STOCK_PRODUCTION,
  productions: AU_RUBBER_FEATURES.STOCK_PRODUCTION,
  "production-statuses": AU_RUBBER_FEATURES.STOCK_PRODUCTION,
  "purchase-requisitions": AU_RUBBER_FEATURES.STOCK_PRODUCTION,
  "requisition-statuses": AU_RUBBER_FEATURES.STOCK_PRODUCTION,
  "requisition-source-types": AU_RUBBER_FEATURES.STOCK_PRODUCTION,
};

export function auRubberFeatureForPath(path: string): string | null {
  const match = path.match(/\/rubber-lining\/portal\/([a-z-]+)/);
  if (!match) {
    return null;
  }
  return ROUTE_CLUSTER_FEATURES[match[1]] ?? null;
}

import { SetMetadata } from "@nestjs/common";
import type { StockManagementFeatureKey } from "../config/stock-management-features.constants";

export const STOCK_MANAGEMENT_FEATURE_METADATA = "stockManagementFeature";

export const StockManagementFeature = (feature: StockManagementFeatureKey) =>
  SetMetadata(STOCK_MANAGEMENT_FEATURE_METADATA, feature);

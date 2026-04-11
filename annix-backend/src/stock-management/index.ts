export {
  STOCK_MANAGEMENT_FEATURE_DESCRIPTIONS,
  STOCK_MANAGEMENT_FEATURES,
  STOCK_MANAGEMENT_TIER_FEATURES,
  STOCK_MANAGEMENT_TIER_RANK,
  type StockManagementFeatureKey,
  type StockManagementTier,
  tierIncludesFeature,
} from "./config/stock-management-features.constants";
export { CompanyModuleLicense } from "./entities/company-module-license.entity";
export { StockManagementFeature } from "./guards/stock-management-feature.decorator";
export { StockManagementFeatureGuard } from "./guards/stock-management-feature.guard";
export {
  STOCK_MANAGEMENT_PERMISSION_DESCRIPTIONS,
  STOCK_MANAGEMENT_PERMISSIONS,
  type StockManagementPermissionKey,
} from "./permissions/stock-management-permissions";
export { StockManagementLicenseService } from "./services/stock-management-license.service";
export { StockManagementModule } from "./stock-management.module";

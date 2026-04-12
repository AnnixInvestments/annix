export { StockManagementApiClient } from "./api/stockManagementApi";
export {
  useAdminMutations,
  useProductCategories,
  useProductDatasheets,
  useRubberCompounds,
  useStockHoldAging,
  useStockHoldPending,
  useVarianceCategories,
} from "./hooks/useAdminQueries";
export {
  useCreateIssuanceSession,
  useIssuableProducts,
  useIssuanceSessions,
} from "./hooks/useIssuanceQueries";
export { useCompanyLicense, useLicenseMutations } from "./hooks/useLicenseQueries";
export {
  useStockTake,
  useStockTakeMutations,
  useStockTakes,
} from "./hooks/useStockTakeQueries";
export {
  DEFAULT_STOCK_MANAGEMENT_LABELS,
  type StockManagementLabelKey,
  type StockManagementLabelOverrides,
} from "./i18n/default-labels";
export {
  STOCK_MANAGEMENT_NAV_ITEMS,
  type StockManagementNavItem,
} from "./manifest";
export { AdminLocationMigrationPage } from "./pages/AdminLocationMigrationPage";
export { AdminPaintMigrationPage } from "./pages/AdminPaintMigrationPage";
export { AdminPaintPackSizesPage } from "./pages/AdminPaintPackSizesPage";
export { AdminProductCategoriesPage } from "./pages/AdminProductCategoriesPage";
export { AdminProductDatasheetsPage } from "./pages/AdminProductDatasheetsPage";
export { AdminRubberCompoundsPage } from "./pages/AdminRubberCompoundsPage";
export { AdminStockHoldPage } from "./pages/AdminStockHoldPage";
export { AdminVarianceCategoriesPage } from "./pages/AdminVarianceCategoriesPage";
export { IssueStockPage } from "./pages/IssueStockPage";
export { ModuleLicensePage } from "./pages/ModuleLicensePage";
export { ReturnsPage } from "./pages/ReturnsPage";
export { StockTakePage } from "./pages/StockTakePage";
export {
  StockManagementContext,
  StockManagementProvider,
} from "./provider/StockManagementProvider";
export {
  useStockManagementConfig,
  useStockManagementFeature,
  useStockManagementHasPermission,
} from "./provider/useStockManagementConfig";
export { DEFAULT_STOCK_MANAGEMENT_THEME } from "./theme/default-theme";
export type {
  StockManagementThemeOverrides,
  StockManagementThemeTokens,
} from "./theme/theme-types";
export type {
  CreateProductCategoryInput,
  CreateRubberCompoundInput,
  CreateVarianceCategoryInput,
  LocationCandidateInput,
  LocationClassificationSuggestionDto,
  ProductDatasheetDto,
  ResolveDispositionInput,
  RubberCompoundDto,
  StockHoldItemDto,
  VarianceCategoryDto,
} from "./types/admin";
export type {
  StockManagementCurrentUser,
  StockManagementHostAppKey,
  StockManagementHostConfig,
  StockManagementResolvedConfig,
} from "./types/config";
export type {
  ConsumableRowInputDto,
  CreateIssuanceSessionDto,
  IssuanceRowDto,
  IssuanceRowInputDto,
  IssuanceRowType,
  IssuanceSessionDto,
  IssuanceSessionFiltersDto,
  IssuanceSessionKind,
  IssuanceSessionListResultDto,
  IssuanceSessionStatus,
  PaintRowInputDto,
  RubberRollRowInputDto,
  SolutionRowInputDto,
} from "./types/issuance";
export {
  STOCK_MANAGEMENT_FEATURE_KEYS,
  STOCK_MANAGEMENT_TIER_RANK,
  type StockManagementFeatureKey,
  type StockManagementLicenseSnapshot,
  type StockManagementTier,
} from "./types/license";
export type {
  ConsumableProductDetailDto,
  IssuableProductDto,
  IssuableProductListResultDto,
  IssuableProductType,
  PaintProductDetailDto,
  ProductCategoryDto,
  RubberOffcutDetailDto,
  RubberRollDetailDto,
  SolutionProductDetailDto,
} from "./types/products";
export type {
  StockTakeDto,
  StockTakeLineDto,
  StockTakeStatus,
} from "./types/stockTake";

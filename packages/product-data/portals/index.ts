export type { Industry, IndustryValue, ProductCategory, SubIndustry } from "./annix-rep-industries";
export {
  allIndustryLabels,
  INDUSTRIES,
  industryByValue,
  productCategoryByValue,
  productCategoryLabelsForSubIndustries,
  productCategoryLabelsForSubIndustry,
  searchTermsForSelection,
  subIndustryByValue,
  subIndustryLabelsForIndustry,
} from "./annix-rep-industries";
export type { PortalCode, PortalHost } from "./constants";
export {
  canonicalHostFor,
  corsOriginsFor,
  DEFAULT_DEV_PORT,
  isAliasHost,
  normaliseHost,
  PORTAL_HOSTS,
  portalForCode,
  portalForHost,
} from "./constants";

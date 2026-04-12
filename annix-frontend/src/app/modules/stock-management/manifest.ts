import type { StockManagementFeatureKey } from "./types/license";

export interface StockManagementNavItem {
  key: string;
  label: string;
  href: string;
  icon?: string;
  requiredFeature?: StockManagementFeatureKey;
  requiredPermission?: string;
  group?: string;
  conditionalVisible?: "pending-count-only";
  order: number;
}

export const STOCK_MANAGEMENT_NAV_ITEMS: ReadonlyArray<StockManagementNavItem> = [
  {
    key: "issue-stock",
    label: "Issue Stock",
    href: "/issue-stock",
    icon: "package-out",
    requiredFeature: "BASIC_ISSUING",
    order: 10,
  },
  {
    key: "returns",
    label: "Returns",
    href: "/returns",
    icon: "package-in",
    requiredFeature: "BASIC_ISSUING",
    order: 20,
  },
  {
    key: "stock-take",
    label: "Stock Take",
    href: "/stock-take",
    icon: "clipboard-check",
    requiredFeature: "STOCK_TAKE",
    order: 30,
  },
  {
    key: "cpo-batch-approvals",
    label: "CPO Batch Approvals",
    href: "/cpo-batch-approvals",
    icon: "shield-check",
    requiredFeature: "CPO_BATCH_ISSUING",
    requiredPermission: "stockManagement.issuance.approve",
    conditionalVisible: "pending-count-only",
    order: 40,
  },
  {
    key: "stock-hold",
    label: "Stock Hold Queue",
    href: "/admin/stock-hold",
    icon: "alert-triangle",
    requiredFeature: "STOCK_HOLD_QUEUE",
    requiredPermission: "stockManagement.stockHold.resolve",
    group: "Admin",
    order: 100,
  },
  {
    key: "product-categories",
    label: "Product Categories",
    href: "/admin/product-categories",
    icon: "folder",
    requiredFeature: "PRODUCT_CATEGORIES",
    requiredPermission: "stockManagement.productCategory.manage",
    group: "Admin",
    order: 110,
  },
  {
    key: "rubber-compounds",
    label: "Rubber Compounds",
    href: "/admin/rubber-compounds",
    icon: "atom",
    requiredFeature: "RUBBER_ROLL_TRACKING",
    requiredPermission: "stockManagement.rubberCompound.manage",
    group: "Admin",
    order: 120,
  },
  {
    key: "paint-pack-sizes",
    label: "Paint Pack Sizes",
    href: "/admin/paint-pack-sizes",
    icon: "droplet",
    requiredFeature: "BASIC_ISSUING",
    requiredPermission: "stockManagement.productCategory.manage",
    group: "Admin",
    order: 125,
  },
  {
    key: "product-datasheets",
    label: "Product Datasheets",
    href: "/admin/product-datasheets",
    icon: "file-text",
    requiredFeature: "PRODUCT_DATASHEETS",
    requiredPermission: "stockManagement.productDatasheet.upload",
    group: "Admin",
    order: 130,
  },
  {
    key: "variance-categories",
    label: "Variance Categories",
    href: "/admin/variance-categories",
    icon: "tag",
    requiredFeature: "STOCK_TAKE",
    requiredPermission: "stockManagement.varianceCategory.manage",
    group: "Admin",
    order: 140,
  },
  {
    key: "module-license",
    label: "Module License",
    href: "/admin/module-license",
    icon: "key",
    requiredPermission: "stockManagement.moduleLicense.manage",
    group: "Admin",
    order: 200,
  },
];

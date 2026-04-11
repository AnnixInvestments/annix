export const STOCK_MANAGEMENT_PERMISSIONS = {
  ISSUANCE_CREATE: "stockManagement.issuance.create",
  ISSUANCE_UNDO: "stockManagement.issuance.undo",
  ISSUANCE_APPROVE: "stockManagement.issuance.approve",
  RETURN_CREATE: "stockManagement.return.create",
  RETURN_APPROVE: "stockManagement.return.approve",
  STOCK_TAKE_COUNT: "stockManagement.stockTake.count",
  STOCK_TAKE_APPROVE: "stockManagement.stockTake.approve",
  STOCK_TAKE_APPROVE_HIGH_VALUE: "stockManagement.stockTake.approve.highValue",
  STOCK_HOLD_FLAG: "stockManagement.stockHold.flag",
  STOCK_HOLD_RESOLVE: "stockManagement.stockHold.resolve",
  PRODUCT_CATEGORY_MANAGE: "stockManagement.productCategory.manage",
  RUBBER_COMPOUND_MANAGE: "stockManagement.rubberCompound.manage",
  PRODUCT_DATASHEET_UPLOAD: "stockManagement.productDatasheet.upload",
  PRODUCT_DATASHEET_VERIFY: "stockManagement.productDatasheet.verify",
  VARIANCE_CATEGORY_MANAGE: "stockManagement.varianceCategory.manage",
  MODULE_LICENSE_MANAGE: "stockManagement.moduleLicense.manage",
} as const;

export type StockManagementPermissionKey =
  (typeof STOCK_MANAGEMENT_PERMISSIONS)[keyof typeof STOCK_MANAGEMENT_PERMISSIONS];

export const STOCK_MANAGEMENT_PERMISSION_DESCRIPTIONS: Record<
  StockManagementPermissionKey,
  string
> = {
  "stockManagement.issuance.create": "Create stock issuance sessions",
  "stockManagement.issuance.undo": "Undo a complete issuance session",
  "stockManagement.issuance.approve": "Approve a pending-approval issuance session",
  "stockManagement.return.create": "Create a stock return",
  "stockManagement.return.approve": "Approve a stock return",
  "stockManagement.stockTake.count": "Enter stock take counts during a session",
  "stockManagement.stockTake.approve": "Approve a stock take session",
  "stockManagement.stockTake.approve.highValue":
    "Approve stock takes whose total absolute variance exceeds the company high-value threshold",
  "stockManagement.stockHold.flag": "Flag a stock item as damaged or expired",
  "stockManagement.stockHold.resolve":
    "Resolve a stock hold item by choosing a disposition (scrap, return, repair, donate)",
  "stockManagement.productCategory.manage": "Create, edit, and disable product categories",
  "stockManagement.rubberCompound.manage": "Create, edit, and disable rubber compounds",
  "stockManagement.productDatasheet.upload": "Upload datasheets for paint, rubber, or solutions",
  "stockManagement.productDatasheet.verify":
    "Verify AI-extracted datasheet values and mark them approved",
  "stockManagement.varianceCategory.manage":
    "Create, edit, and disable stock take variance categories",
  "stockManagement.moduleLicense.manage":
    "View and modify the company module license tier and feature overrides",
};

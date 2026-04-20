export const MODULE_CODES = {
  INVENTORY: "inventory",
  JOB_CARDS: "job-cards",
  COATINGS: "coatings",
  PURCHASING: "purchasing",
  DELIVERIES: "deliveries",
  RUBBER_PRODUCTION: "rubber-production",
  RUBBER_COCS: "rubber-cocs",
  QUALITY: "quality",
  SAGE: "sage",
  MESSAGING: "messaging",
  STAFF: "staff",
  REPORTS: "reports",
} as const;

export type ModuleCode = (typeof MODULE_CODES)[keyof typeof MODULE_CODES];

export interface ModuleDefinition {
  code: ModuleCode;
  label: string;
  description: string;
  icon: string;
}

export const MODULE_DEFINITIONS: ModuleDefinition[] = [
  {
    code: MODULE_CODES.INVENTORY,
    label: "Inventory",
    description: "Stock items, locations, movements, import",
    icon: "package",
  },
  {
    code: MODULE_CODES.JOB_CARDS,
    label: "Job Cards",
    description: "Job cards, workflow engine, approvals, dispatch",
    icon: "clipboard",
  },
  {
    code: MODULE_CODES.COATINGS,
    label: "Coatings",
    description: "Coating analysis, PosiTector, DFT, QC plans",
    icon: "paint-bucket",
  },
  {
    code: MODULE_CODES.PURCHASING,
    label: "Purchasing",
    description: "Requisitions, CPOs, call-offs, supplier invoices",
    icon: "shopping-cart",
  },
  {
    code: MODULE_CODES.DELIVERIES,
    label: "Deliveries",
    description: "Inbound/outbound DNs, extraction, reconciliation",
    icon: "truck",
  },
  {
    code: MODULE_CODES.RUBBER_PRODUCTION,
    label: "Rubber Production",
    description: "Compound stock, roll stock, production batches",
    icon: "factory",
  },
  {
    code: MODULE_CODES.RUBBER_COCS,
    label: "Rubber CoCs",
    description: "Supplier CoC processing, AU CoC generation, graph linking",
    icon: "file-check",
  },
  {
    code: MODULE_CODES.QUALITY,
    label: "Quality",
    description: "Certificates, calibration, batch quality metrics, drift alerts",
    icon: "shield-check",
  },
  {
    code: MODULE_CODES.SAGE,
    label: "Sage",
    description: "Sage Accounting integration (invoices, contacts)",
    icon: "calculator",
  },
  {
    code: MODULE_CODES.MESSAGING,
    label: "Messaging",
    description: "Chat, notifications, push subscriptions",
    icon: "message-circle",
  },
  {
    code: MODULE_CODES.STAFF,
    label: "Staff",
    description: "Staff directory, leave tracking, QR tokens",
    icon: "users",
  },
  {
    code: MODULE_CODES.REPORTS,
    label: "Reports",
    description: "Reporting engine with module-specific report types",
    icon: "bar-chart",
  },
];

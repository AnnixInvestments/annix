import { MODULE_CODES, type ModuleCode } from "./modules";

export interface OpsNavItem {
  key: string;
  href: string;
  label: string;
  group: string;
  requiredModules: ModuleCode[];
  permission: string | null;
  order: number;
}

export const NAV_GROUPS = [
  { key: "core", label: "Core", order: 0 },
  { key: "inventory", label: "Inventory", order: 1 },
  { key: "manufacturing", label: "Manufacturing", order: 2 },
  { key: "purchasing", label: "Purchasing", order: 3 },
  { key: "deliveries", label: "Deliveries", order: 4 },
  { key: "rubber", label: "Rubber", order: 5 },
  { key: "quality", label: "Quality", order: 6 },
  { key: "contacts", label: "Contacts", order: 7 },
  { key: "reports", label: "Reports", order: 8 },
  { key: "admin", label: "Administration", order: 9 },
] as const;

export type NavGroupKey = (typeof NAV_GROUPS)[number]["key"];

export const OPS_NAV_ITEMS: OpsNavItem[] = [
  {
    key: "dashboard",
    href: "/ops/portal/dashboard",
    label: "Dashboard",
    group: "core",
    requiredModules: [],
    permission: null,
    order: 0,
  },

  {
    key: "stock",
    href: "/ops/portal/inventory",
    label: "Stock Items",
    group: "inventory",
    requiredModules: [MODULE_CODES.INVENTORY],
    permission: "stock:view",
    order: 10,
  },
  {
    key: "stock-locations",
    href: "/ops/portal/inventory/locations",
    label: "Locations",
    group: "inventory",
    requiredModules: [MODULE_CODES.INVENTORY],
    permission: "stock:view",
    order: 11,
  },
  {
    key: "stock-movements",
    href: "/ops/portal/inventory/movements",
    label: "Movement History",
    group: "inventory",
    requiredModules: [MODULE_CODES.INVENTORY],
    permission: "stock:view",
    order: 12,
  },

  {
    key: "job-cards",
    href: "/ops/portal/job-cards",
    label: "Job Cards",
    group: "manufacturing",
    requiredModules: [MODULE_CODES.JOB_CARDS],
    permission: "jobs:view",
    order: 20,
  },
  {
    key: "coating-analysis",
    href: "/ops/portal/coatings",
    label: "Coating Analysis",
    group: "manufacturing",
    requiredModules: [MODULE_CODES.COATINGS],
    permission: "qc:view",
    order: 21,
  },
  {
    key: "dispatch",
    href: "/ops/portal/dispatch",
    label: "Dispatch",
    group: "manufacturing",
    requiredModules: [MODULE_CODES.JOB_CARDS],
    permission: "jobs:view",
    order: 22,
  },

  {
    key: "purchase-orders",
    href: "/ops/portal/purchase-orders",
    label: "Purchase Orders",
    group: "purchasing",
    requiredModules: [MODULE_CODES.PURCHASING],
    permission: "requisitions:view",
    order: 30,
  },
  {
    key: "invoices",
    href: "/ops/portal/invoices",
    label: "Invoices",
    group: "purchasing",
    requiredModules: [MODULE_CODES.PURCHASING],
    permission: "invoices:view",
    order: 31,
  },

  {
    key: "delivery-notes",
    href: "/ops/portal/deliveries",
    label: "Delivery Notes",
    group: "deliveries",
    requiredModules: [MODULE_CODES.DELIVERIES],
    permission: "deliveries:view",
    order: 40,
  },

  {
    key: "compound-stock",
    href: "/ops/portal/rubber/compound-stock",
    label: "Compound Stock",
    group: "rubber",
    requiredModules: [MODULE_CODES.RUBBER_PRODUCTION],
    permission: "compound-stocks:view",
    order: 50,
  },
  {
    key: "roll-stock",
    href: "/ops/portal/rubber/roll-stock",
    label: "Roll Stock",
    group: "rubber",
    requiredModules: [MODULE_CODES.RUBBER_PRODUCTION],
    permission: "roll-stock:view",
    order: 51,
  },
  {
    key: "production",
    href: "/ops/portal/rubber/production",
    label: "Production",
    group: "rubber",
    requiredModules: [MODULE_CODES.RUBBER_PRODUCTION],
    permission: "productions:view",
    order: 52,
  },
  {
    key: "supplier-cocs",
    href: "/ops/portal/rubber/supplier-cocs",
    label: "Supplier CoCs",
    group: "rubber",
    requiredModules: [MODULE_CODES.RUBBER_COCS],
    permission: "supplier-cocs:view",
    order: 53,
  },
  {
    key: "au-cocs",
    href: "/ops/portal/rubber/au-cocs",
    label: "AU Certificates",
    group: "rubber",
    requiredModules: [MODULE_CODES.RUBBER_COCS],
    permission: "au-cocs:view",
    order: 54,
  },

  {
    key: "certificates",
    href: "/ops/portal/quality/certificates",
    label: "Certificates",
    group: "quality",
    requiredModules: [MODULE_CODES.QUALITY],
    permission: "certificates:view",
    order: 60,
  },
  {
    key: "calibration",
    href: "/ops/portal/quality/calibration",
    label: "Calibration",
    group: "quality",
    requiredModules: [MODULE_CODES.QUALITY],
    permission: "certificates:view",
    order: 61,
  },
  {
    key: "quality-tracking",
    href: "/ops/portal/quality/tracking",
    label: "Quality Tracking",
    group: "quality",
    requiredModules: [MODULE_CODES.QUALITY],
    permission: "qc:view",
    order: 62,
  },

  {
    key: "suppliers",
    href: "/ops/portal/contacts/suppliers",
    label: "Suppliers",
    group: "contacts",
    requiredModules: [],
    permission: null,
    order: 70,
  },
  {
    key: "customers",
    href: "/ops/portal/contacts/customers",
    label: "Customers",
    group: "contacts",
    requiredModules: [],
    permission: null,
    order: 71,
  },

  {
    key: "reports",
    href: "/ops/portal/reports",
    label: "Reports",
    group: "reports",
    requiredModules: [MODULE_CODES.REPORTS],
    permission: "reports:view",
    order: 80,
  },

  {
    key: "staff",
    href: "/ops/portal/admin/staff",
    label: "Staff",
    group: "admin",
    requiredModules: [MODULE_CODES.STAFF],
    permission: "staff:view",
    order: 90,
  },
  {
    key: "settings",
    href: "/ops/portal/settings",
    label: "Settings",
    group: "admin",
    requiredModules: [],
    permission: "settings:manage",
    order: 99,
  },
];

export function visibleNavItems(
  activeModules: string[],
  permissions: string[],
  isAdmin: boolean,
): OpsNavItem[] {
  return OPS_NAV_ITEMS.filter((item) => {
    const moduleRequired =
      item.requiredModules.length === 0 ||
      item.requiredModules.some((mod) => activeModules.includes(mod));

    if (!moduleRequired) {
      return false;
    }

    if (isAdmin || !item.permission) {
      return true;
    }

    return permissions.includes(item.permission);
  });
}

export function visibleNavGroups(
  items: OpsNavItem[],
): Array<{ key: NavGroupKey; label: string; items: OpsNavItem[] }> {
  const itemsByGroup = new Map<string, OpsNavItem[]>();

  for (const item of items) {
    const existing = itemsByGroup.get(item.group) ?? [];
    itemsByGroup.set(item.group, [...existing, item]);
  }

  return NAV_GROUPS.filter((group) => itemsByGroup.has(group.key)).map((group) => ({
    key: group.key,
    label: group.label,
    items: (itemsByGroup.get(group.key) ?? []).sort((a, b) => a.order - b.order),
  }));
}

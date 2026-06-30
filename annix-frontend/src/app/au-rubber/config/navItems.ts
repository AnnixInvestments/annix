import { PAGE_PERMISSIONS } from "./pagePermissions";

export interface AuNavItemDef {
  key: string;
  href: string;
  label: string;
  group?: string;
  permission?: string;
}

export interface AuNavSection {
  key: string;
  label: string;
  items: AuNavItemDef[];
}

export const AU_NAV_GROUP_ORDER = [
  "Products",
  "Suppliers",
  "Customers",
  "Documents",
  "Stock",
  "Prices",
  "Website",
  "Companies",
  "Accounting",
] as const;

export const AU_NAV_ITEMS: AuNavItemDef[] = [
  {
    key: "dashboard",
    href: "/au-rubber/portal/dashboard",
    label: "Dashboard",
    permission: PAGE_PERMISSIONS["/au-rubber/portal/dashboard"],
  },

  {
    key: "products",
    href: "/au-rubber/portal/products",
    label: "All Products",
    group: "Products",
    permission: PAGE_PERMISSIONS["/au-rubber/portal/products"],
  },
  {
    key: "codings",
    href: "/au-rubber/portal/codings",
    label: "Product Codings",
    group: "Products",
    permission: PAGE_PERMISSIONS["/au-rubber/portal/codings"],
  },

  {
    key: "supplier-orders",
    href: "/au-rubber/portal/supplier-orders",
    label: "Supplier Orders",
    group: "Suppliers",
    permission: PAGE_PERMISSIONS["/au-rubber/portal/orders"],
  },
  {
    key: "supplier-delivery-notes",
    href: "/au-rubber/portal/delivery-notes/suppliers",
    label: "Delivery Notes",
    group: "Suppliers",
    permission: PAGE_PERMISSIONS["/au-rubber/portal/delivery-notes"],
  },
  {
    key: "supplier-tax-invoices",
    href: "/au-rubber/portal/tax-invoices/suppliers",
    label: "Tax Invoices",
    group: "Suppliers",
    permission: PAGE_PERMISSIONS["/au-rubber/portal/tax-invoices"],
  },
  {
    key: "supplier-cocs",
    href: "/au-rubber/portal/supplier-cocs",
    label: "Supplier CoCs",
    group: "Suppliers",
    permission: PAGE_PERMISSIONS["/au-rubber/portal/supplier-cocs"],
  },
  {
    key: "supplier-statements",
    href: "/au-rubber/portal/supplier-statements",
    label: "Statements",
    group: "Suppliers",
    permission: PAGE_PERMISSIONS["/au-rubber/portal/supplier-statements"],
  },

  {
    key: "customer-orders",
    href: "/au-rubber/portal/orders",
    label: "Customer Orders",
    group: "Customers",
    permission: PAGE_PERMISSIONS["/au-rubber/portal/orders"],
  },
  {
    key: "customer-delivery-notes",
    href: "/au-rubber/portal/delivery-notes/customers",
    label: "Delivery Notes",
    group: "Customers",
    permission: PAGE_PERMISSIONS["/au-rubber/portal/delivery-notes"],
  },
  {
    key: "customer-tax-invoices",
    href: "/au-rubber/portal/tax-invoices/customers",
    label: "Tax Invoices",
    group: "Customers",
    permission: PAGE_PERMISSIONS["/au-rubber/portal/tax-invoices"],
  },
  {
    key: "au-cocs",
    href: "/au-rubber/portal/au-cocs",
    label: "AU Certificates",
    group: "Customers",
    permission: PAGE_PERMISSIONS["/au-rubber/portal/au-cocs"],
  },

  {
    key: "quality-tracking",
    href: "/au-rubber/portal/quality-tracking",
    label: "Quality Tracking",
    group: "Documents",
    permission: PAGE_PERMISSIONS["/au-rubber/portal/quality-tracking"],
  },
  {
    key: "roll-stock",
    href: "/au-rubber/portal/roll-stock",
    label: "Roll Stock",
    group: "Documents",
    permission: PAGE_PERMISSIONS["/au-rubber/portal/roll-stock"],
  },

  {
    key: "compound-stocks",
    href: "/au-rubber/portal/compound-stocks",
    label: "Compound Inventory",
    group: "Stock",
    permission: PAGE_PERMISSIONS["/au-rubber/portal/compound-stocks"],
  },
  {
    key: "compound-orders",
    href: "/au-rubber/portal/compound-orders",
    label: "Compound Orders",
    group: "Stock",
    permission: PAGE_PERMISSIONS["/au-rubber/portal/compound-orders"],
  },
  {
    key: "productions",
    href: "/au-rubber/portal/productions",
    label: "Production",
    group: "Stock",
    permission: PAGE_PERMISSIONS["/au-rubber/portal/productions"],
  },
  {
    key: "stock-movements",
    href: "/au-rubber/portal/stock-movements",
    label: "Movement History",
    group: "Stock",
    permission: PAGE_PERMISSIONS["/au-rubber/portal/stock-movements"],
  },
  {
    key: "stock-locations",
    href: "/au-rubber/portal/stock-locations",
    label: "Stock Locations",
    group: "Stock",
    permission: PAGE_PERMISSIONS["/au-rubber/portal/stock-locations"],
  },
  {
    key: "purchase-requisitions",
    href: "/au-rubber/portal/purchase-requisitions",
    label: "Purchase Requisitions",
    group: "Stock",
    permission: PAGE_PERMISSIONS["/au-rubber/portal/purchase-requisitions"],
  },
  {
    key: "other-items",
    href: "/au-rubber/portal/other-items",
    label: "Other Items",
    group: "Stock",
    permission: PAGE_PERMISSIONS["/au-rubber/portal/other-items"],
  },

  {
    key: "pricing-tiers",
    href: "/au-rubber/portal/pricing-tiers",
    label: "Pricing Tiers",
    group: "Prices",
    permission: PAGE_PERMISSIONS["/au-rubber/portal/pricing-tiers"],
  },

  {
    key: "website-pages",
    href: "/au-rubber/portal/website",
    label: "Pages",
    group: "Website",
    permission: PAGE_PERMISSIONS["/au-rubber/portal/website"],
  },
  {
    key: "website-blog",
    href: "/au-rubber/portal/website/blog",
    label: "Blog",
    group: "Website",
    permission: PAGE_PERMISSIONS["/au-rubber/portal/website"],
  },
  {
    key: "website-testimonials",
    href: "/au-rubber/portal/website/testimonials",
    label: "Testimonials",
    group: "Website",
    permission: PAGE_PERMISSIONS["/au-rubber/portal/website"],
  },

  {
    key: "companies-suppliers",
    href: "/au-rubber/portal/companies/suppliers",
    label: "Suppliers",
    group: "Companies",
    permission: PAGE_PERMISSIONS["/au-rubber/portal/companies/suppliers"],
  },
  {
    key: "companies-customers",
    href: "/au-rubber/portal/companies/customers",
    label: "Customers",
    group: "Companies",
    permission: PAGE_PERMISSIONS["/au-rubber/portal/companies/customers"],
  },
  {
    key: "companies-suppliers-statements",
    href: "/au-rubber/portal/companies/suppliers/statements",
    label: "Supplier Statements",
    group: "Companies",
    permission: PAGE_PERMISSIONS["/au-rubber/portal/companies/suppliers/statements"],
  },
  {
    key: "companies-customers-statements",
    href: "/au-rubber/portal/companies/customers/statements",
    label: "Customer Statements",
    group: "Companies",
    permission: PAGE_PERMISSIONS["/au-rubber/portal/companies/customers/statements"],
  },

  {
    key: "accounting-overview",
    href: "/au-rubber/portal/accounting",
    label: "Overview",
    group: "Accounting",
    permission: PAGE_PERMISSIONS["/au-rubber/portal/accounting"],
  },
  {
    key: "accounting-payable",
    href: "/au-rubber/portal/accounting/payable",
    label: "Accounts Payable",
    group: "Accounting",
    permission: PAGE_PERMISSIONS["/au-rubber/portal/accounting/payable"],
  },
  {
    key: "accounting-receivable",
    href: "/au-rubber/portal/accounting/receivable",
    label: "Accounts Receivable",
    group: "Accounting",
    permission: PAGE_PERMISSIONS["/au-rubber/portal/accounting/receivable"],
  },
  {
    key: "accounting-reconciliation",
    href: "/au-rubber/portal/accounting/reconciliation",
    label: "Reconciliation",
    group: "Accounting",
    permission: PAGE_PERMISSIONS["/au-rubber/portal/accounting/reconciliation"],
  },
  {
    key: "accounting-directors",
    href: "/au-rubber/portal/accounting/directors",
    label: "Directors",
    group: "Accounting",
    permission: PAGE_PERMISSIONS["/au-rubber/portal/accounting/directors"],
  },
  {
    key: "accounting-history",
    href: "/au-rubber/portal/accounting/history",
    label: "History",
    group: "Accounting",
    permission: PAGE_PERMISSIONS["/au-rubber/portal/accounting/history"],
  },
];

export function canAccessAuNavItem(
  item: AuNavItemDef,
  ctx: { isAdmin: boolean; hasPermission: (permission: string) => boolean },
): boolean {
  if (ctx.isAdmin) {
    return true;
  }
  const permission = item.permission;
  if (!permission) {
    return true;
  }
  return ctx.hasPermission(permission);
}

export function auNavSections(items: AuNavItemDef[]): AuNavSection[] {
  return AU_NAV_GROUP_ORDER.map((group) => {
    const groupItems = items.filter((item) => item.group === group);
    return { key: group, label: group, items: groupItems };
  }).filter((section) => section.items.length > 0);
}

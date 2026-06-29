import type { ModuleLicensingDefinition } from "../../licensing";

export const AU_RUBBER_MODULE_KEY = "au-rubber";

export const AU_RUBBER_FEATURES = {
  CORE_OPERATIONS: "CORE_OPERATIONS",
  STOCK_PRODUCTION: "STOCK_PRODUCTION",
  QUALITY_TRACEABILITY: "QUALITY_TRACEABILITY",
  INVOICING_TAX: "INVOICING_TAX",
  DOC_AI_BASIC: "DOC_AI_BASIC",
  DOC_AI_FULL: "DOC_AI_FULL",
  COC_COMPLIANCE: "COC_COMPLIANCE",
  ACCOUNTING_RECON: "ACCOUNTING_RECON",
  AFFILIATE_COMMISSION: "AFFILIATE_COMMISSION",
  SAGE_EXPORT: "SAGE_EXPORT",
  WEBSITE_CMS: "WEBSITE_CMS",
  WHITE_LABEL_RBAC: "WHITE_LABEL_RBAC",
} as const;

export type AuRubberFeatureKey = (typeof AU_RUBBER_FEATURES)[keyof typeof AU_RUBBER_FEATURES];

export const AU_RUBBER_TIERS = {
  ESSENTIALS: "essentials",
  OPERATIONS: "operations",
  COMPLIANCE: "compliance",
  COMPLETE: "complete",
} as const;

export type AuRubberTierKey = (typeof AU_RUBBER_TIERS)[keyof typeof AU_RUBBER_TIERS];

export const AU_RUBBER_ADD_ONS = {
  WEB_HOSTING: "WEB_HOSTING",
  SEO_IMPROVEMENT: "SEO_IMPROVEMENT",
} as const;

export type AuRubberAddOnKey = (typeof AU_RUBBER_ADD_ONS)[keyof typeof AU_RUBBER_ADD_ONS];

export const AU_RUBBER_LICENSING: ModuleLicensingDefinition = {
  moduleKey: AU_RUBBER_MODULE_KEY,
  defaultTier: AU_RUBBER_TIERS.ESSENTIALS,
  features: [
    {
      key: AU_RUBBER_FEATURES.CORE_OPERATIONS,
      label: "Core operations",
      description:
        "Dashboard, customers/suppliers, products, orders, manual delivery notes, stock visibility, user/role admin.",
      category: "Operations",
      displayOrder: 0,
    },
    {
      key: AU_RUBBER_FEATURES.STOCK_PRODUCTION,
      label: "Stock & production",
      description:
        "Roll/compound stock, movements, locations, stock-take and production/compounding.",
      category: "Operations",
      displayOrder: 1,
    },
    {
      key: AU_RUBBER_FEATURES.QUALITY_TRACEABILITY,
      label: "Quality & traceability",
      description: "Batch tests, quality alerts, roll issuance with photo ID and rejections.",
      category: "Quality",
      displayOrder: 2,
    },
    {
      key: AU_RUBBER_FEATURES.INVOICING_TAX,
      label: "Invoicing & tax",
      description: "Customer/supplier tax invoices, pricing tiers and product cost builder.",
      category: "Finance",
      displayOrder: 3,
    },
    {
      key: AU_RUBBER_FEATURES.DOC_AI_BASIC,
      label: "Document AI — delivery notes & invoices",
      description: "AI extraction for delivery notes and tax invoices (allowance-capped).",
      category: "Document AI",
      displayOrder: 4,
    },
    {
      key: AU_RUBBER_FEATURES.DOC_AI_FULL,
      label: "Document AI — full suite",
      description:
        "All CoC types, supplier statements, roll-label photos and the inbound-email document pipeline.",
      category: "Document AI",
      displayOrder: 5,
      requires: [AU_RUBBER_FEATURES.DOC_AI_BASIC],
    },
    {
      key: AU_RUBBER_FEATURES.COC_COMPLIANCE,
      label: "CoC compliance & generation",
      description:
        "AU CoC generation, readiness state machine, auto-generation, email dispatch, graph linking and supplier-CoC workflow.",
      category: "Compliance",
      displayOrder: 6,
      requires: [AU_RUBBER_FEATURES.DOC_AI_FULL],
    },
    {
      key: AU_RUBBER_FEATURES.ACCOUNTING_RECON,
      label: "Accounting & reconciliation",
      description:
        "Supplier-statement reconciliation, payable/receivable, monthly accounts, director sign-off, credit notes and cost-of-sale.",
      category: "Finance",
      displayOrder: 7,
    },
    {
      key: AU_RUBBER_FEATURES.AFFILIATE_COMMISSION,
      label: "Affiliate & Commission",
      description:
        "Sales rep commission tracking, affiliate management, price-list uploads, commission payout on paid invoices.",
      category: "Finance",
      displayOrder: 8,
    },
    {
      key: AU_RUBBER_FEATURES.SAGE_EXPORT,
      label: "Sage export",
      description: "Export CoCs/invoices to Sage accounting via the adapter.",
      category: "Finance",
      displayOrder: 9,
    },
    {
      key: AU_RUBBER_FEATURES.WEBSITE_CMS,
      label: "Website CMS",
      description: "Blog, testimonials and marketing page editor.",
      category: "Website",
      displayOrder: 9,
    },
    {
      key: AU_RUBBER_FEATURES.WHITE_LABEL_RBAC,
      label: "White-label & custom RBAC",
      description: "Custom branding, custom roles/permissions and priority support.",
      category: "Platform",
      displayOrder: 10,
    },
  ],
  tiers: [
    {
      key: AU_RUBBER_TIERS.ESSENTIALS,
      name: "Essentials",
      description: "Core ops: customers/suppliers, products, orders, manual delivery notes, stock.",
      rank: 0,
      monthlyPriceCents: 150_000,
      annualPriceCents: 1_500_000,
      includedSeats: 3,
      aiDocAllowance: 0,
      visibility: "public",
      displayOrder: 0,
    },
    {
      key: AU_RUBBER_TIERS.OPERATIONS,
      name: "Operations",
      description:
        "Full stock/production, quality & traceability, invoicing and capped Document AI.",
      rank: 1,
      monthlyPriceCents: 400_000,
      annualPriceCents: 4_000_000,
      includedSeats: 8,
      aiDocAllowance: 150,
      visibility: "public",
      displayOrder: 1,
    },
    {
      key: AU_RUBBER_TIERS.COMPLIANCE,
      name: "Compliance",
      description:
        "Full Document-AI suite plus CoC generation, automation and supplier-CoC workflow.",
      rank: 2,
      monthlyPriceCents: 750_000,
      annualPriceCents: 7_500_000,
      includedSeats: 15,
      aiDocAllowance: 500,
      visibility: "public",
      displayOrder: 2,
    },
    {
      key: AU_RUBBER_TIERS.COMPLETE,
      name: "Complete",
      description:
        "Everything: accounting & reconciliation, Sage export, website CMS, white-label and custom RBAC.",
      rank: 3,
      monthlyPriceCents: 1_300_000,
      annualPriceCents: 13_000_000,
      includedSeats: 999,
      aiDocAllowance: 1_500,
      visibility: "public",
      displayOrder: 3,
    },
  ],
  tierFeatures: {
    [AU_RUBBER_TIERS.ESSENTIALS]: [AU_RUBBER_FEATURES.CORE_OPERATIONS],
    [AU_RUBBER_TIERS.OPERATIONS]: [
      AU_RUBBER_FEATURES.CORE_OPERATIONS,
      AU_RUBBER_FEATURES.STOCK_PRODUCTION,
      AU_RUBBER_FEATURES.QUALITY_TRACEABILITY,
      AU_RUBBER_FEATURES.INVOICING_TAX,
      AU_RUBBER_FEATURES.DOC_AI_BASIC,
    ],
    [AU_RUBBER_TIERS.COMPLIANCE]: [
      AU_RUBBER_FEATURES.CORE_OPERATIONS,
      AU_RUBBER_FEATURES.STOCK_PRODUCTION,
      AU_RUBBER_FEATURES.QUALITY_TRACEABILITY,
      AU_RUBBER_FEATURES.INVOICING_TAX,
      AU_RUBBER_FEATURES.DOC_AI_BASIC,
      AU_RUBBER_FEATURES.DOC_AI_FULL,
      AU_RUBBER_FEATURES.COC_COMPLIANCE,
    ],
    [AU_RUBBER_TIERS.COMPLETE]: [
      AU_RUBBER_FEATURES.CORE_OPERATIONS,
      AU_RUBBER_FEATURES.STOCK_PRODUCTION,
      AU_RUBBER_FEATURES.QUALITY_TRACEABILITY,
      AU_RUBBER_FEATURES.INVOICING_TAX,
      AU_RUBBER_FEATURES.DOC_AI_BASIC,
      AU_RUBBER_FEATURES.DOC_AI_FULL,
      AU_RUBBER_FEATURES.COC_COMPLIANCE,
      AU_RUBBER_FEATURES.ACCOUNTING_RECON,
      AU_RUBBER_FEATURES.AFFILIATE_COMMISSION,
      AU_RUBBER_FEATURES.SAGE_EXPORT,
      AU_RUBBER_FEATURES.WEBSITE_CMS,
      AU_RUBBER_FEATURES.WHITE_LABEL_RBAC,
    ],
  },
  addOns: [
    {
      key: AU_RUBBER_ADD_ONS.WEB_HOSTING,
      label: "Web hosting",
      description:
        "Managed hosting for the customer website. Fixed monthly fee — not discountable.",
      monthlyPriceCents: 45_000,
      discountable: false,
      requiresFeature: AU_RUBBER_FEATURES.WEBSITE_CMS,
    },
    {
      key: AU_RUBBER_ADD_ONS.SEO_IMPROVEMENT,
      label: "SEO & website improvement",
      description: "Ongoing SEO and website improvement retainer. Monthly fee.",
      monthlyPriceCents: 350_000,
      discountable: true,
      requiresFeature: AU_RUBBER_FEATURES.WEBSITE_CMS,
    },
  ],
};

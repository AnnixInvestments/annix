import type { ModuleLicensingDefinition, TierDefinition } from "../licensing.types";

function standardTiers(): TierDefinition[] {
  return [
    {
      key: "free",
      name: "Free",
      description: "Get started at no cost.",
      rank: 0,
      monthlyPriceCents: 0,
      annualPriceCents: 0,
      includedSeats: 1,
      aiDocAllowance: 0,
      visibility: "public",
      displayOrder: 0,
    },
    {
      key: "pro",
      name: "Pro",
      description: "For growing teams that need more.",
      rank: 1,
      monthlyPriceCents: 0,
      annualPriceCents: 0,
      includedSeats: 5,
      aiDocAllowance: 0,
      visibility: "public",
      displayOrder: 1,
    },
    {
      key: "enterprise",
      name: "Enterprise",
      description: "Unlimited scale and priority support.",
      rank: 2,
      monthlyPriceCents: 0,
      annualPriceCents: 0,
      includedSeats: 999,
      aiDocAllowance: 0,
      visibility: "public",
      displayOrder: 2,
    },
  ];
}

function standardModule(moduleKey: string): ModuleLicensingDefinition {
  return {
    moduleKey,
    defaultTier: "free",
    features: [],
    tiers: standardTiers(),
    tierFeatures: { free: [], pro: [], enterprise: [] },
  };
}

export const DEFAULT_APP_LICENSING: ModuleLicensingDefinition[] = [
  standardModule("stock-control"),
  standardModule("rfq-platform"),
  standardModule("annix-sentinel"),
  standardModule("annix-rep"),
  standardModule("insights"),
];

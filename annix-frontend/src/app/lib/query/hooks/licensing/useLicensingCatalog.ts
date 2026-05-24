import { useQuery } from "@tanstack/react-query";
import { browserBaseUrl } from "@/lib/api-config";
import { licensingKeys } from "../../keys";

export type TierVisibility = "public" | "hidden" | "contact-us";

export interface CatalogTier {
  key: string;
  name: string;
  description: string;
  rank: number;
  monthlyPriceCents: number;
  annualPriceCents: number;
  includedSeats: number;
  aiDocAllowance: number;
  visibility: TierVisibility;
  displayOrder: number;
  featureKeys: string[];
}

export interface CatalogFeature {
  key: string;
  label: string;
  description: string;
  category: string;
  displayOrder: number;
}

export interface CatalogAddOn {
  key: string;
  label: string;
  description: string;
  monthlyPriceCents: number;
  discountable: boolean;
  requiresFeature: string | null;
}

export interface ModuleCatalog {
  moduleKey: string;
  defaultTier: string;
  tiers: CatalogTier[];
  features: CatalogFeature[];
  addOns: CatalogAddOn[];
}

async function fetchLicensingCatalog(moduleKey: string): Promise<ModuleCatalog> {
  const response = await fetch(`${browserBaseUrl()}/licensing/${moduleKey}/catalog`);
  if (!response.ok) {
    throw new Error("Failed to load pricing");
  }
  return response.json();
}

export function useLicensingCatalog(moduleKey: string) {
  return useQuery<ModuleCatalog>({
    queryKey: licensingKeys.catalog(moduleKey),
    queryFn: () => fetchLicensingCatalog(moduleKey),
    staleTime: 300_000,
  });
}

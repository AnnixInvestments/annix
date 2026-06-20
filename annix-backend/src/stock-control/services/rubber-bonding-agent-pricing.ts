import { RubberBondingAgent } from "../entities/rubber-bonding-agent.entity";

export interface RubberBondingAgentPricing {
  pricePerLitre: number | null;
  costPerM2: number;
  salePerM2: number;
}

const round2 = (value: number): number => Math.round(value * 100) / 100;

export function computeRubberBondingAgentPricing(
  agent: RubberBondingAgent,
  consumableMarkup: number,
): RubberBondingAgentPricing {
  const derivedPerLitre =
    agent.pricePerLitre ??
    (agent.pricePerTin != null && agent.packSizeLitres != null && agent.packSizeLitres > 0
      ? agent.pricePerTin / agent.packSizeLitres
      : null);
  const costPerM2 =
    derivedPerLitre != null && agent.areaCoverPerLitre != null && agent.areaCoverPerLitre > 0
      ? derivedPerLitre / agent.areaCoverPerLitre
      : 0;
  const salePerM2 = costPerM2 * consumableMarkup;
  return {
    pricePerLitre: derivedPerLitre != null ? round2(derivedPerLitre) : null,
    costPerM2: round2(costPerM2),
    salePerM2: round2(salePerM2),
  };
}

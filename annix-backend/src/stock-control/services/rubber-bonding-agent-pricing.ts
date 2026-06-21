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
  const derivedPerUnit =
    agent.pricePerLitre ??
    (agent.pricePerTin != null && agent.packSizeLitres != null && agent.packSizeLitres > 0
      ? agent.pricePerTin / agent.packSizeLitres
      : null);
  const gramsPerM2 = agent.gramsPerM2;
  const areaCoverPerLitre = agent.areaCoverPerLitre;
  let costPerM2 = 0;
  if (derivedPerUnit != null && agent.coverageBasis !== "none") {
    if (agent.coverageBasis === "gram") {
      // derivedPerUnit is price per kg; gramsPerM2 / 1000 = kg of adhesive used per m²
      costPerM2 = gramsPerM2 != null && gramsPerM2 > 0 ? derivedPerUnit * (gramsPerM2 / 1000) : 0;
    } else {
      costPerM2 =
        areaCoverPerLitre != null && areaCoverPerLitre > 0 ? derivedPerUnit / areaCoverPerLitre : 0;
    }
  }
  const salePerM2 = costPerM2 * consumableMarkup;
  return {
    pricePerLitre: derivedPerUnit != null ? round2(derivedPerUnit) : null,
    costPerM2: round2(costPerM2),
    salePerM2: round2(salePerM2),
  };
}

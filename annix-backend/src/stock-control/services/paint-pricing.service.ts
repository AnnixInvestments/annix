import { Injectable } from "@nestjs/common";
import { PaintPriceListItem } from "../entities/paint-price-list-item.entity";
import type { PaintPricingConfig } from "../entities/paint-pricing-config";

export interface PaintTierPrice {
  name: string;
  discountPercent: number;
  pricePerM2: number;
}

export interface PaintPricingResult {
  microns: number;
  flatPlateCoverageM2PerLitre: number;
  coverageAfterLossM2PerLitre: number;
  paintCostPerLitre: number;
  thinnerCostPerLitre: number;
  effectiveCostPerLitre: number;
  thinnerCostPerM2: number;
  costPerM2: number;
  salePerM2: number;
  tierPrices: PaintTierPrice[];
}

const round2 = (value: number): number => Math.round(value * 100) / 100;

@Injectable()
export class PaintPricingService {
  paintCostPerLitre(item: PaintPriceListItem): number {
    const perLitreFromKit =
      item.costPerKit && item.packSizeLitres && item.packSizeLitres > 0
        ? item.costPerKit / item.packSizeLitres
        : null;
    const basePerLitre = perLitreFromKit ?? item.costPerLitre;
    return basePerLitre * (1 + (item.upliftPercent ?? 0) / 100);
  }

  thinnerCostPerLitre(item: PaintPriceListItem): number {
    return item.maxThinningPercent && item.thinnerPricePerLitre
      ? (item.maxThinningPercent / 100) * item.thinnerPricePerLitre
      : 0;
  }

  resolveMicrons(item: PaintPriceListItem): number {
    const override = item.micronsOverride;
    if (override && override > 0) {
      return override;
    }
    const recommended = item.recommendedMicrons;
    return recommended && recommended > 0 ? recommended : 0;
  }

  computePricing(item: PaintPriceListItem, config: PaintPricingConfig): PaintPricingResult {
    const microns = this.resolveMicrons(item);
    const volSolids = item.volumeSolidsPercent ?? 0;
    const flatPlate = microns > 0 ? (volSolids * 10) / microns : 0;
    const lossFactor = (100 - config.lossPct) / 100;
    const coverageAfterLoss = flatPlate * lossFactor;
    const paintPerLitre = this.paintCostPerLitre(item);
    const thinnerPerLitre = this.thinnerCostPerLitre(item);
    const effectivePerLitre = paintPerLitre + thinnerPerLitre;
    const costPerM2 = coverageAfterLoss > 0 ? effectivePerLitre / coverageAfterLoss : 0;
    const thinnerCostPerM2 = coverageAfterLoss > 0 ? thinnerPerLitre / coverageAfterLoss : 0;
    const salePerM2 = (costPerM2 + config.applicationCostPerM2) * config.markupFactor;
    const tierPrices = config.discountTiers.map((tier) => ({
      name: tier.name,
      discountPercent: tier.discountPercent,
      pricePerM2: round2(salePerM2 * (1 - tier.discountPercent / 100)),
    }));

    return {
      microns,
      flatPlateCoverageM2PerLitre: round2(flatPlate),
      coverageAfterLossM2PerLitre: round2(coverageAfterLoss),
      paintCostPerLitre: round2(paintPerLitre),
      thinnerCostPerLitre: round2(thinnerPerLitre),
      effectiveCostPerLitre: round2(effectivePerLitre),
      thinnerCostPerM2: round2(thinnerCostPerM2),
      costPerM2: round2(costPerM2),
      salePerM2: round2(salePerM2),
      tierPrices,
    };
  }
}

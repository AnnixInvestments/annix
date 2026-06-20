import { Injectable } from "@nestjs/common";
import { RubberPriceListItem } from "../entities/rubber-price-list-item.entity";
import {
  RubberFamilyPricingConfig,
  RubberPriceFamily,
  RubberPricingConfig,
} from "../entities/rubber-pricing-config";

export interface RubberLabourStack {
  blastingPerM2: number;
  curingPerM2: number;
  rubberLiningPerM2: number;
  handlingPerM2: number;
  finishingPerM2: number;
  solutionPerM2: number;
  totalPerM2: number;
}

export interface RubberThicknessPrice {
  thicknessMm: number;
  materialPerM2: number;
  salePerM2: number;
  mpsPerM2: number;
}

export interface RubberRunningMetrePrice {
  nb: string;
  factor: number;
  salePerMetre: number;
  mpsPerMetre: number;
}

export interface RubberBondingAgentSalePrice {
  name: string;
  salePerM2: number | null;
}

export interface RubberPricingResult {
  family: RubberPriceFamily;
  costWithWastePerKg: number;
  cwPerM2: number;
  labourStack: RubberLabourStack;
  thicknesses: RubberThicknessPrice[];
  runningMetres: RubberRunningMetrePrice[] | null;
}

const round2 = (value: number): number => Math.round(value * 100) / 100;
const round4 = (value: number): number => Math.round(value * 10000) / 10000;

@Injectable()
export class RubberPricingService {
  paraffinPerM2(config: RubberPricingConfig): number {
    const { ltrsPerCure, costPerLitre, m2PerPot } = config.paraffin;
    return m2PerPot > 0 ? (ltrsPerCure * costPerLitre) / m2PerPot : 0;
  }

  blastingPerM2(config: RubberPricingConfig): number {
    const blasting = config.blasting;
    const blastAvg = config.deptAvgHourly.Blast ?? 0;
    const labour = blasting.m2PerHour > 0 ? (blastAvg * blasting.crewSize) / blasting.m2PerHour : 0;
    const electricity =
      blasting.m2PerHour > 0
        ? (blasting.elecAvgRate * blasting.elecAvgKwh) / blasting.m2PerHour
        : 0;
    const grit = blasting.gritM2PerBag > 0 ? blasting.gritBagCost / blasting.gritM2PerBag : 0;
    return (labour + electricity + grit) * blasting.margin;
  }

  private componentPerM2(
    config: RubberPricingConfig,
    component: { department: string; m2PerHour: number },
  ): number {
    const rate = config.deptAvgHourly[component.department] ?? 0;
    return component.m2PerHour > 0 ? rate / component.m2PerHour : 0;
  }

  labourStack(config: RubberPricingConfig, family: RubberPriceFamily): RubberLabourStack {
    const familyConfig = config[family];
    const blastingPerM2 = this.blastingPerM2(config);
    const curingPerM2 = this.paraffinPerM2(config);
    const rubberLiningPerM2 = this.componentPerM2(config, familyConfig.rubberLining);
    const handlingPerM2 = this.componentPerM2(config, familyConfig.handling);
    const finishingPerM2 = this.componentPerM2(config, familyConfig.finishing);
    const solutionPerM2 = this.componentPerM2(config, familyConfig.solution);
    const totalPerM2 =
      blastingPerM2 +
      curingPerM2 +
      rubberLiningPerM2 +
      handlingPerM2 +
      finishingPerM2 +
      solutionPerM2;
    return {
      blastingPerM2: round2(blastingPerM2),
      curingPerM2: round2(curingPerM2),
      rubberLiningPerM2: round2(rubberLiningPerM2),
      handlingPerM2: round2(handlingPerM2),
      finishingPerM2: round2(finishingPerM2),
      solutionPerM2: round2(solutionPerM2),
      totalPerM2: round2(totalPerM2),
    };
  }

  private agentPortionPerM2(
    familyConfig: RubberFamilyPricingConfig,
    bondingType: string | null,
    agents?: RubberBondingAgentSalePrice[] | null,
  ): number {
    const baseline = bondingType ? (familyConfig.cwAgentBaselinePerM2[bondingType] ?? 0) : 0;
    if (!bondingType || !agents || agents.length === 0) {
      return baseline;
    }
    const recipe = familyConfig.cwRecipes?.[bondingType];
    if (!recipe || recipe.length === 0) {
      return baseline;
    }
    const priceByName = new Map(agents.map((agent) => [agent.name, agent.salePerM2]));
    const resolved = recipe.map((name) => priceByName.get(name));
    const allResolvable = resolved.every((sale) => sale != null && sale > 0);
    if (!allResolvable) {
      return baseline;
    }
    return resolved.reduce<number>((total, sale) => total + (sale ?? 0), 0);
  }

  cwPerM2(
    config: RubberPricingConfig,
    family: RubberPriceFamily,
    bondingType: string | null,
    agents?: RubberBondingAgentSalePrice[] | null,
  ): number {
    const familyConfig = config[family];
    const agentPortion = this.agentPortionPerM2(familyConfig, bondingType, agents);
    return this.labourStack(config, family).totalPerM2 + agentPortion;
  }

  costWithWastePerKg(item: RubberPriceListItem, familyConfig: RubberFamilyPricingConfig): number {
    const base = item.costPerKg ?? 0;
    const uplift = (item.upliftPercent ?? 0) / 100;
    return base * (1 + familyConfig.wastePct) * (1 + uplift);
  }

  materialPerM2(
    item: RubberPriceListItem,
    familyConfig: RubberFamilyPricingConfig,
    thicknessMm: number,
  ): number {
    return item.specificGravity * thicknessMm * this.costWithWastePerKg(item, familyConfig);
  }

  salePerM2(
    item: RubberPriceListItem,
    config: RubberPricingConfig,
    thicknessMm: number,
    options: {
      family: RubberPriceFamily;
      bondingType?: string | null;
      agents?: RubberBondingAgentSalePrice[] | null;
    },
  ): number {
    const family = options.family;
    const familyConfig = config[family];
    const material = this.materialPerM2(item, familyConfig, thicknessMm);
    const bondingType = options.bondingType ?? item.bondingType;
    return (
      material * familyConfig.markupFactor +
      this.cwPerM2(config, family, bondingType, options.agents)
    );
  }

  computePricing(
    item: RubberPriceListItem,
    config: RubberPricingConfig,
    options: {
      family: RubberPriceFamily;
      bondingType?: string | null;
      agents?: RubberBondingAgentSalePrice[] | null;
    },
  ): RubberPricingResult {
    const family = options.family;
    const familyConfig = config[family];
    const labourStack = this.labourStack(config, family);
    const bondingType = options.bondingType ?? item.bondingType;
    const cw = this.cwPerM2(config, family, bondingType, options.agents);
    const thicknesses = familyConfig.thicknessesMm.map((thicknessMm) => {
      const material = this.materialPerM2(item, familyConfig, thicknessMm);
      const sale = material * familyConfig.markupFactor + cw;
      return {
        thicknessMm,
        materialPerM2: round2(material),
        salePerM2: round2(sale),
        mpsPerM2: round2(sale * familyConfig.mpsFactor),
      };
    });

    const runningMetres =
      family === "pipe"
        ? config.pipe.nbFactors.map((nbFactor) => {
            const factor = nbFactor.pie + nbFactor.additional;
            const referenceSale = thicknesses.length
              ? thicknesses[thicknesses.length - 1].salePerM2
              : 0;
            return {
              nb: nbFactor.nb,
              factor: round4(factor),
              salePerMetre: round2(referenceSale * factor),
              mpsPerMetre: round2(referenceSale * factor * familyConfig.mpsFactor),
            };
          })
        : null;

    return {
      family,
      costWithWastePerKg: round2(this.costWithWastePerKg(item, familyConfig)),
      cwPerM2: round2(cw),
      labourStack,
      thicknesses,
      runningMetres,
    };
  }

  computeBothFamilies(
    item: RubberPriceListItem,
    config: RubberPricingConfig,
    options?: { bondingType?: string | null; agents?: RubberBondingAgentSalePrice[] | null },
  ): { plate: RubberPricingResult; pipe: RubberPricingResult } {
    return {
      plate: this.computePricing(item, config, { ...options, family: "plate" }),
      pipe: this.computePricing(item, config, { ...options, family: "pipe" }),
    };
  }

  runningMetrePrice(
    item: RubberPriceListItem,
    config: RubberPricingConfig,
    thicknessMm: number,
    nb: string,
    options?: { bondingType?: string | null; agents?: RubberBondingAgentSalePrice[] | null },
  ): RubberRunningMetrePrice | null {
    const nbFactor = config.pipe.nbFactors.find((entry) => entry.nb === nb);
    if (!nbFactor) {
      return null;
    }
    const factor = nbFactor.pie + nbFactor.additional;
    const sale = this.salePerM2(item, config, thicknessMm, { ...options, family: "pipe" });
    return {
      nb,
      factor: round4(factor),
      salePerMetre: round2(sale * factor),
      mpsPerMetre: round2(sale * factor * config.pipe.mpsFactor),
    };
  }
}

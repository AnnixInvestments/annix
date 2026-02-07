// Pump Comparison Module
// Used for comparing multiple pump quotes and specifications

export interface PumpQuote {
  supplierId: number;
  supplierName: string;
  quoteDate: string;
  validUntil?: string;
  items: PumpQuoteItem[];
  totalPrice: number;
  currency: string;
  leadTimeWeeks?: number;
  warrantyMonths?: number;
  notes?: string;
}

export interface PumpQuoteItem {
  itemId: string;
  description: string;
  pumpType: string;
  manufacturer?: string;
  model?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  specifications: PumpQuoteSpecification;
  deliveryWeeks?: number;
}

export interface PumpQuoteSpecification {
  flowRateM3h?: number;
  headM?: number;
  powerKw?: number;
  efficiency?: number;
  npshRequired?: number;
  speedRpm?: number;
  material?: string;
  sealType?: string;
  couplingType?: string;
  motorFrame?: string;
  voltageV?: number;
  frequency?: number;
}

export interface ComparisonMetric {
  name: string;
  unit: string;
  values: (number | string | null)[];
  bestIndex: number;
  comparison: "lower" | "higher" | "equal";
}

export interface PumpComparisonResult {
  quotes: PumpQuote[];
  priceComparison: {
    lowestPrice: number;
    highestPrice: number;
    averagePrice: number;
    priceSpread: number;
    priceSpreadPercent: number;
    bestPriceIndex: number;
  };
  specificationComparison: ComparisonMetric[];
  recommendations: string[];
  overallScores: { supplierId: number; score: number; rank: number }[];
}

export const comparePumpQuotes = (quotes: PumpQuote[]): PumpComparisonResult => {
  if (quotes.length === 0) {
    return {
      quotes: [],
      priceComparison: {
        lowestPrice: 0,
        highestPrice: 0,
        averagePrice: 0,
        priceSpread: 0,
        priceSpreadPercent: 0,
        bestPriceIndex: -1,
      },
      specificationComparison: [],
      recommendations: [],
      overallScores: [],
    };
  }

  const prices = quotes.map((q) => q.totalPrice);
  const lowestPrice = Math.min(...prices);
  const highestPrice = Math.max(...prices);
  const averagePrice = prices.reduce((a, b) => a + b, 0) / prices.length;
  const priceSpread = highestPrice - lowestPrice;
  const priceSpreadPercent = lowestPrice > 0 ? (priceSpread / lowestPrice) * 100 : 0;
  const bestPriceIndex = prices.indexOf(lowestPrice);

  const specificationComparison = compareSpecifications(quotes);
  const recommendations = generateRecommendations(quotes, specificationComparison);
  const overallScores = calculateOverallScores(quotes, specificationComparison);

  return {
    quotes,
    priceComparison: {
      lowestPrice,
      highestPrice,
      averagePrice: Math.round(averagePrice * 100) / 100,
      priceSpread,
      priceSpreadPercent: Math.round(priceSpreadPercent * 100) / 100,
      bestPriceIndex,
    },
    specificationComparison,
    recommendations,
    overallScores,
  };
};

const compareSpecifications = (quotes: PumpQuote[]): ComparisonMetric[] => {
  const metrics: ComparisonMetric[] = [];

  const specKeys: {
    key: keyof PumpQuoteSpecification;
    name: string;
    unit: string;
    comparison: "lower" | "higher" | "equal";
  }[] = [
    { key: "flowRateM3h", name: "Flow Rate", unit: "m³/h", comparison: "higher" },
    { key: "headM", name: "Head", unit: "m", comparison: "higher" },
    { key: "powerKw", name: "Motor Power", unit: "kW", comparison: "lower" },
    { key: "efficiency", name: "Efficiency", unit: "%", comparison: "higher" },
    { key: "npshRequired", name: "NPSHr", unit: "m", comparison: "lower" },
    { key: "speedRpm", name: "Speed", unit: "RPM", comparison: "equal" },
  ];

  specKeys.forEach(({ key, name, unit, comparison }) => {
    const values = quotes.map((q) => {
      const firstItem = q.items[0];
      if (!firstItem) return null;
      const value = firstItem.specifications[key];
      return typeof value === "number" ? value : null;
    });

    const numericValues = values.filter((v): v is number => v !== null);
    if (numericValues.length === 0) return;

    let bestIndex = 0;
    if (comparison === "higher") {
      const maxVal = Math.max(...numericValues);
      bestIndex = values.indexOf(maxVal);
    } else if (comparison === "lower") {
      const minVal = Math.min(...numericValues);
      bestIndex = values.indexOf(minVal);
    }

    metrics.push({
      name,
      unit,
      values,
      bestIndex,
      comparison,
    });
  });

  const leadTimes = quotes.map((q) => q.leadTimeWeeks ?? null);
  const numericLeadTimes = leadTimes.filter((v): v is number => v !== null);
  if (numericLeadTimes.length > 0) {
    const minLeadTime = Math.min(...numericLeadTimes);
    metrics.push({
      name: "Lead Time",
      unit: "weeks",
      values: leadTimes,
      bestIndex: leadTimes.indexOf(minLeadTime),
      comparison: "lower",
    });
  }

  const warranties = quotes.map((q) => q.warrantyMonths ?? null);
  const numericWarranties = warranties.filter((v): v is number => v !== null);
  if (numericWarranties.length > 0) {
    const maxWarranty = Math.max(...numericWarranties);
    metrics.push({
      name: "Warranty",
      unit: "months",
      values: warranties,
      bestIndex: warranties.indexOf(maxWarranty),
      comparison: "higher",
    });
  }

  return metrics;
};

const generateRecommendations = (
  quotes: PumpQuote[],
  specComparison: ComparisonMetric[],
): string[] => {
  const recommendations: string[] = [];

  if (quotes.length < 2) {
    recommendations.push("Request additional quotes for better comparison");
    return recommendations;
  }

  const prices = quotes.map((q) => q.totalPrice);
  const lowestPrice = Math.min(...prices);
  const highestPrice = Math.max(...prices);
  const priceSpreadPercent =
    lowestPrice > 0 ? ((highestPrice - lowestPrice) / lowestPrice) * 100 : 0;

  if (priceSpreadPercent > 30) {
    recommendations.push(
      `Significant price variation (${Math.round(priceSpreadPercent)}%) - investigate reasons for difference`,
    );
  }

  const efficiencyMetric = specComparison.find((m) => m.name === "Efficiency");
  if (efficiencyMetric) {
    const effValues = efficiencyMetric.values.filter((v): v is number => typeof v === "number");
    if (effValues.length > 1) {
      const maxEff = Math.max(...effValues);
      const minEff = Math.min(...effValues);
      if (maxEff - minEff > 5) {
        recommendations.push(
          `Efficiency varies by ${Math.round(maxEff - minEff)}% - higher efficiency reduces operating costs`,
        );
      }
    }
  }

  const npshMetric = specComparison.find((m) => m.name === "NPSHr");
  if (npshMetric) {
    const npshValues = npshMetric.values.filter((v): v is number => typeof v === "number");
    if (npshValues.length > 0) {
      const maxNpsh = Math.max(...npshValues);
      if (maxNpsh > 5) {
        recommendations.push("High NPSHr values detected - verify site NPSH available");
      }
    }
  }

  const leadTimeMetric = specComparison.find((m) => m.name === "Lead Time");
  if (leadTimeMetric) {
    const leadValues = leadTimeMetric.values.filter((v): v is number => typeof v === "number");
    if (leadValues.length > 1) {
      const maxLead = Math.max(...leadValues);
      const minLead = Math.min(...leadValues);
      if (maxLead - minLead > 4) {
        recommendations.push(
          `Lead times vary significantly (${minLead}-${maxLead} weeks) - consider project schedule`,
        );
      }
    }
  }

  const warrantyMetric = specComparison.find((m) => m.name === "Warranty");
  if (warrantyMetric) {
    const warrantyValues = warrantyMetric.values.filter((v): v is number => typeof v === "number");
    if (warrantyValues.length > 1) {
      const maxWarranty = Math.max(...warrantyValues);
      const minWarranty = Math.min(...warrantyValues);
      if (maxWarranty - minWarranty >= 12) {
        recommendations.push(
          `Warranty periods differ significantly (${minWarranty}-${maxWarranty} months)`,
        );
      }
    }
  }

  const bestPriceIdx = prices.indexOf(lowestPrice);
  let bestOverallIdx = bestPriceIdx;
  let bestScore = 0;

  quotes.forEach((quote, idx) => {
    let score = 0;
    specComparison.forEach((metric) => {
      if (metric.bestIndex === idx) {
        score += 1;
      }
    });
    if (idx === bestPriceIdx) {
      score += 2;
    }
    if (score > bestScore) {
      bestScore = score;
      bestOverallIdx = idx;
    }
  });

  if (bestOverallIdx === bestPriceIdx) {
    recommendations.push(
      `${quotes[bestPriceIdx].supplierName} offers best overall value (lowest price with competitive specs)`,
    );
  } else {
    recommendations.push(
      `Consider ${quotes[bestOverallIdx].supplierName} for best overall specifications`,
    );
    recommendations.push(`${quotes[bestPriceIdx].supplierName} offers lowest price`);
  }

  return recommendations;
};

const calculateOverallScores = (
  quotes: PumpQuote[],
  specComparison: ComparisonMetric[],
): { supplierId: number; score: number; rank: number }[] => {
  const scores = quotes.map((quote, idx) => {
    let score = 0;
    const maxScore = specComparison.length + 2;

    specComparison.forEach((metric) => {
      if (metric.bestIndex === idx) {
        score += 1;
      }
    });

    const prices = quotes.map((q) => q.totalPrice);
    const lowestPrice = Math.min(...prices);
    if (quote.totalPrice === lowestPrice) {
      score += 2;
    } else {
      const priceRatio = lowestPrice / quote.totalPrice;
      score += priceRatio * 2;
    }

    return {
      supplierId: quote.supplierId,
      score: Math.round((score / maxScore) * 100),
      rank: 0,
    };
  });

  scores.sort((a, b) => b.score - a.score);
  scores.forEach((s, idx) => {
    s.rank = idx + 1;
  });

  return scores;
};

export interface LifecycleCostInputs {
  purchasePrice: number;
  installationCost: number;
  powerKw: number;
  efficiency: number;
  operatingHoursPerYear: number;
  electricityRatePerKwh: number;
  maintenanceCostPerYear: number;
  expectedLifeYears: number;
  discountRate: number;
}

export interface LifecycleCostResult {
  totalPurchaseCost: number;
  annualEnergyCost: number;
  totalEnergyCost: number;
  totalMaintenanceCost: number;
  totalLifecycleCost: number;
  npvLifecycleCost: number;
  costPerOperatingHour: number;
  energyCostPercent: number;
  breakdown: {
    category: string;
    cost: number;
    percent: number;
  }[];
}

export const calculateLifecycleCost = (inputs: LifecycleCostInputs): LifecycleCostResult => {
  const {
    purchasePrice,
    installationCost,
    powerKw,
    efficiency,
    operatingHoursPerYear,
    electricityRatePerKwh,
    maintenanceCostPerYear,
    expectedLifeYears,
    discountRate,
  } = inputs;

  const totalPurchaseCost = purchasePrice + installationCost;

  const actualPowerKw = efficiency > 0 ? powerKw / (efficiency / 100) : powerKw;
  const annualEnergyKwh = actualPowerKw * operatingHoursPerYear;
  const annualEnergyCost = annualEnergyKwh * electricityRatePerKwh;

  const totalEnergyCost = annualEnergyCost * expectedLifeYears;
  const totalMaintenanceCost = maintenanceCostPerYear * expectedLifeYears;

  const totalLifecycleCost = totalPurchaseCost + totalEnergyCost + totalMaintenanceCost;

  let npvLifecycleCost = totalPurchaseCost;
  const r = discountRate / 100;

  Array.from({ length: expectedLifeYears }).forEach((_, year) => {
    const yearlyOperatingCost = annualEnergyCost + maintenanceCostPerYear;
    const discountFactor = 1 / (1 + r) ** (year + 1);
    npvLifecycleCost += yearlyOperatingCost * discountFactor;
  });

  const totalOperatingHours = operatingHoursPerYear * expectedLifeYears;
  const costPerOperatingHour =
    totalOperatingHours > 0 ? totalLifecycleCost / totalOperatingHours : 0;

  const energyCostPercent =
    totalLifecycleCost > 0 ? (totalEnergyCost / totalLifecycleCost) * 100 : 0;

  const breakdown = [
    {
      category: "Purchase & Installation",
      cost: totalPurchaseCost,
      percent: totalLifecycleCost > 0 ? (totalPurchaseCost / totalLifecycleCost) * 100 : 0,
    },
    {
      category: "Energy",
      cost: totalEnergyCost,
      percent: totalLifecycleCost > 0 ? (totalEnergyCost / totalLifecycleCost) * 100 : 0,
    },
    {
      category: "Maintenance",
      cost: totalMaintenanceCost,
      percent: totalLifecycleCost > 0 ? (totalMaintenanceCost / totalLifecycleCost) * 100 : 0,
    },
  ];

  return {
    totalPurchaseCost: Math.round(totalPurchaseCost * 100) / 100,
    annualEnergyCost: Math.round(annualEnergyCost * 100) / 100,
    totalEnergyCost: Math.round(totalEnergyCost * 100) / 100,
    totalMaintenanceCost: Math.round(totalMaintenanceCost * 100) / 100,
    totalLifecycleCost: Math.round(totalLifecycleCost * 100) / 100,
    npvLifecycleCost: Math.round(npvLifecycleCost * 100) / 100,
    costPerOperatingHour: Math.round(costPerOperatingHour * 100) / 100,
    energyCostPercent: Math.round(energyCostPercent * 100) / 100,
    breakdown: breakdown.map((b) => ({
      ...b,
      cost: Math.round(b.cost * 100) / 100,
      percent: Math.round(b.percent * 100) / 100,
    })),
  };
};

export const compareLifecycleCosts = (
  quotes: PumpQuote[],
  commonInputs: Omit<LifecycleCostInputs, "purchasePrice" | "powerKw" | "efficiency">,
): { quote: PumpQuote; lifecycleCost: LifecycleCostResult }[] => {
  return quotes.map((quote) => {
    const firstItem = quote.items[0];
    const specs = firstItem?.specifications ?? {};

    const lifecycleCost = calculateLifecycleCost({
      purchasePrice: quote.totalPrice,
      installationCost: commonInputs.installationCost,
      powerKw: specs.powerKw ?? 0,
      efficiency: specs.efficiency ?? 70,
      operatingHoursPerYear: commonInputs.operatingHoursPerYear,
      electricityRatePerKwh: commonInputs.electricityRatePerKwh,
      maintenanceCostPerYear: commonInputs.maintenanceCostPerYear,
      expectedLifeYears: commonInputs.expectedLifeYears,
      discountRate: commonInputs.discountRate,
    });

    return { quote, lifecycleCost };
  });
};

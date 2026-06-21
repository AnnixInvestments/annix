import type { RubberPriceFamily, RubberPricingConfig } from "@/app/lib/api/stockControlApi";

export function blastingCostPerM2(config: RubberPricingConfig): number {
  const blasting = config.blasting;
  const perHour = blasting.m2PerHour;
  if (perHour <= 0) {
    return 0;
  }
  const blastDeptRate = config.deptAvgHourly.Blast;
  const blastRate = blastDeptRate ?? 0;
  const labour = (blastRate * blasting.crewSize) / perHour;
  const electricity = (blasting.elecAvgRate * blasting.elecAvgKwh) / perHour;
  const grit = blasting.gritM2PerBag > 0 ? blasting.gritBagCost / blasting.gritM2PerBag : 0;
  return (labour + electricity + grit) * blasting.margin;
}

export function curingCostPerM2(config: RubberPricingConfig): number {
  const paraffin = config.paraffin;
  return paraffin.m2PerPot > 0
    ? (paraffin.ltrsPerCure * paraffin.costPerLitre) / paraffin.m2PerPot
    : 0;
}

export function labourCostPerM2(config: RubberPricingConfig, family: RubberPriceFamily): number {
  const familyConfig = config[family];
  const components = [
    familyConfig.rubberLining,
    familyConfig.handling,
    familyConfig.finishing,
    familyConfig.solution,
  ];
  return components.reduce<number>((total, component) => {
    const rate = config.deptAvgHourly[component.department];
    const safeRate = rate ?? 0;
    const perHour = component.m2PerHour;
    return total + (perHour > 0 ? safeRate / perHour : 0);
  }, 0);
}

export function fixedStackPerM2(config: RubberPricingConfig, family: RubberPriceFamily): number {
  return blastingCostPerM2(config) + curingCostPerM2(config) + labourCostPerM2(config, family);
}

function recipeAgentSum(
  recipe: string[] | undefined,
  saleByName: Map<string, number | null>,
): number | null {
  if (!recipe || recipe.length === 0) {
    return null;
  }
  const resolved = recipe.map((name) => {
    const sale = saleByName.get(name);
    return sale ?? null;
  });
  const allResolvable = resolved.every((sale) => sale != null && sale > 0);
  if (!allResolvable) {
    return null;
  }
  return resolved.reduce<number>((total, sale) => total + (sale ?? 0), 0);
}

export function agentPortionPerM2(
  config: RubberPricingConfig,
  family: RubberPriceFamily,
  bondingType: string,
  supplier: string,
  saleByName: Map<string, number | null>,
): number {
  const familyConfig = config[family];
  const baselineMap = familyConfig.cwAgentBaselinePerM2;
  const baselineRaw = baselineMap[bondingType];
  const baseline = baselineRaw ?? 0;
  const supplierBaselines = familyConfig.cwAgentSupplierBaselines;
  const supplierBaselineMap = supplierBaselines ? supplierBaselines[supplier] : undefined;
  const supplierBaseline = supplierBaselineMap ? supplierBaselineMap[bondingType] : undefined;
  const supplierRecipes = familyConfig.cwSupplierRecipes;
  const supplierRecipeMap = supplierRecipes ? supplierRecipes[supplier] : undefined;
  const supplierRecipe = supplierRecipeMap ? supplierRecipeMap[bondingType] : undefined;
  const legacyRecipes = familyConfig.cwRecipes;
  const legacyRecipe = legacyRecipes ? legacyRecipes[bondingType] : undefined;
  const recipe = supplierRecipe ?? legacyRecipe;
  const recipeSum = recipeAgentSum(recipe, saleByName);
  if (supplierRecipe != null && supplierRecipe.length > 0 && recipeSum != null) {
    return recipeSum;
  }
  if (supplierBaseline != null) {
    return supplierBaseline;
  }
  if (recipeSum != null) {
    return recipeSum;
  }
  return baseline;
}

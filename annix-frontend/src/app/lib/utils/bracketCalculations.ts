import {
  BracketDimensions,
  BracketEntry,
  BracketType,
  CompensationPlateDimensions,
  CompensationPlateEntry,
} from '@/app/lib/config/rfq/bracketsAndPlates';
import { SteelMaterial, steelMaterialById } from '@/app/lib/config/rfq/steelMaterials';

export interface BracketCalculationResult {
  volumeM3: number;
  weightKg: number;
  costPerUnit: number;
  totalCost: number;
}

export interface PlateCalculationResult {
  volumeM3: number;
  weightKg: number;
  costPerUnit: number;
  totalCost: number;
}

const mmToMeters = (mm: number): number => mm / 1000;

const calculateRectangularVolumeM3 = (lengthMm: number, widthMm: number, thicknessMm: number): number => {
  const lengthM = mmToMeters(lengthMm);
  const widthM = mmToMeters(widthMm);
  const thicknessM = mmToMeters(thicknessMm);
  return lengthM * widthM * thicknessM;
};

export const calculateLBracketVolume = (dimensions: BracketDimensions): number => {
  const { leg1LengthMm, leg2LengthMm, widthMm, thicknessMm } = dimensions;

  const leg1Volume = calculateRectangularVolumeM3(leg1LengthMm, widthMm, thicknessMm);
  const leg2Volume = calculateRectangularVolumeM3(leg2LengthMm, widthMm, thicknessMm);
  const overlapVolume = calculateRectangularVolumeM3(thicknessMm, widthMm, thicknessMm);

  return leg1Volume + leg2Volume - overlapVolume;
};

export const calculateUBracketVolume = (dimensions: BracketDimensions): number => {
  const { leg1LengthMm, leg2LengthMm, widthMm, thicknessMm } = dimensions;

  const baseWidth = leg1LengthMm;
  const legHeight = leg2LengthMm;

  const baseVolume = calculateRectangularVolumeM3(baseWidth, widthMm, thicknessMm);
  const leg1Volume = calculateRectangularVolumeM3(legHeight, widthMm, thicknessMm);
  const leg2Volume = calculateRectangularVolumeM3(legHeight, widthMm, thicknessMm);

  return baseVolume + leg1Volume + leg2Volume;
};

export const calculateFlatBracketVolume = (dimensions: BracketDimensions): number => {
  const { leg1LengthMm, widthMm, thicknessMm } = dimensions;
  return calculateRectangularVolumeM3(leg1LengthMm, widthMm, thicknessMm);
};

export const calculateBracketVolume = (bracketType: BracketType, dimensions: BracketDimensions): number => {
  if (bracketType === 'L_BRACKET' || bracketType === 'CUSTOM') {
    return calculateLBracketVolume(dimensions);
  } else if (bracketType === 'U_BRACKET') {
    return calculateUBracketVolume(dimensions);
  } else if (bracketType === 'FLAT_BRACKET') {
    return calculateFlatBracketVolume(dimensions);
  }
  return calculateLBracketVolume(dimensions);
};

export const calculateBracket = (
  bracketType: BracketType,
  dimensions: BracketDimensions,
  materialId: string,
  costPerKgOverride: number | null,
  quantity: number
): BracketCalculationResult => {
  const material = steelMaterialById(materialId);
  if (!material) {
    return { volumeM3: 0, weightKg: 0, costPerUnit: 0, totalCost: 0 };
  }

  const volumeM3 = calculateBracketVolume(bracketType, dimensions);
  const weightKg = volumeM3 * material.densityKgM3;
  const costPerKg = costPerKgOverride !== null ? costPerKgOverride : material.defaultCostPerKg;
  const costPerUnit = weightKg * costPerKg;
  const totalCost = costPerUnit * quantity;

  return {
    volumeM3: Math.round(volumeM3 * 1000000) / 1000000,
    weightKg: Math.round(weightKg * 1000) / 1000,
    costPerUnit: Math.round(costPerUnit * 100) / 100,
    totalCost: Math.round(totalCost * 100) / 100,
  };
};

export const calculatePlateVolume = (dimensions: CompensationPlateDimensions): number => {
  return calculateRectangularVolumeM3(dimensions.lengthMm, dimensions.widthMm, dimensions.thicknessMm);
};

export const calculateCompensationPlate = (
  dimensions: CompensationPlateDimensions,
  materialId: string,
  costPerKgOverride: number | null,
  quantity: number
): PlateCalculationResult => {
  const material = steelMaterialById(materialId);
  if (!material) {
    return { volumeM3: 0, weightKg: 0, costPerUnit: 0, totalCost: 0 };
  }

  const volumeM3 = calculatePlateVolume(dimensions);
  const weightKg = volumeM3 * material.densityKgM3;
  const costPerKg = costPerKgOverride !== null ? costPerKgOverride : material.defaultCostPerKg;
  const costPerUnit = weightKg * costPerKg;
  const totalCost = costPerUnit * quantity;

  return {
    volumeM3: Math.round(volumeM3 * 1000000) / 1000000,
    weightKg: Math.round(weightKg * 1000) / 1000,
    costPerUnit: Math.round(costPerUnit * 100) / 100,
    totalCost: Math.round(totalCost * 100) / 100,
  };
};

export const recalculateBracketEntry = (entry: BracketEntry): BracketEntry => {
  const result = calculateBracket(
    entry.bracketType,
    entry.dimensions,
    entry.materialId,
    entry.costPerKgOverride,
    entry.quantity
  );

  return {
    ...entry,
    calculatedWeightKg: result.weightKg,
    calculatedCostPerUnit: result.costPerUnit,
    calculatedTotalCost: result.totalCost,
  };
};

export const recalculatePlateEntry = (entry: CompensationPlateEntry): CompensationPlateEntry => {
  const result = calculateCompensationPlate(
    entry.dimensions,
    entry.materialId,
    entry.costPerKgOverride,
    entry.quantity
  );

  return {
    ...entry,
    calculatedWeightKg: result.weightKg,
    calculatedCostPerUnit: result.costPerUnit,
    calculatedTotalCost: result.totalCost,
  };
};

export const validateBracketDimensions = (dimensions: BracketDimensions): string[] => {
  const errors: string[] = [];

  if (dimensions.leg1LengthMm <= 0) {
    errors.push('Leg 1 length must be greater than 0');
  }
  if (dimensions.leg1LengthMm > 2000) {
    errors.push('Leg 1 length exceeds maximum (2000mm)');
  }
  if (dimensions.leg2LengthMm <= 0) {
    errors.push('Leg 2 length must be greater than 0');
  }
  if (dimensions.leg2LengthMm > 2000) {
    errors.push('Leg 2 length exceeds maximum (2000mm)');
  }
  if (dimensions.widthMm <= 0) {
    errors.push('Width must be greater than 0');
  }
  if (dimensions.widthMm > 500) {
    errors.push('Width exceeds maximum (500mm)');
  }
  if (dimensions.thicknessMm <= 0) {
    errors.push('Thickness must be greater than 0');
  }
  if (dimensions.thicknessMm > 50) {
    errors.push('Thickness exceeds maximum (50mm)');
  }
  if (dimensions.angleDegrees < 30 || dimensions.angleDegrees > 180) {
    errors.push('Angle must be between 30 and 180 degrees');
  }

  return errors;
};

export const validatePlateDimensions = (dimensions: CompensationPlateDimensions): string[] => {
  const errors: string[] = [];

  if (dimensions.lengthMm <= 0) {
    errors.push('Length must be greater than 0');
  }
  if (dimensions.lengthMm > 1000) {
    errors.push('Length exceeds maximum (1000mm)');
  }
  if (dimensions.widthMm <= 0) {
    errors.push('Width must be greater than 0');
  }
  if (dimensions.widthMm > 1000) {
    errors.push('Width exceeds maximum (1000mm)');
  }
  if (dimensions.thicknessMm <= 0) {
    errors.push('Thickness must be greater than 0');
  }
  if (dimensions.thicknessMm > 50) {
    errors.push('Thickness exceeds maximum (50mm)');
  }

  return errors;
};

export const summarizeBracketsAndPlates = (
  brackets: BracketEntry[],
  plates: CompensationPlateEntry[]
): {
  totalBrackets: number;
  totalPlates: number;
  totalBracketWeight: number;
  totalPlateWeight: number;
  totalBracketCost: number;
  totalPlateCost: number;
  grandTotalWeight: number;
  grandTotalCost: number;
} => {
  const totalBrackets = brackets.reduce((sum, b) => sum + b.quantity, 0);
  const totalPlates = plates.reduce((sum, p) => sum + p.quantity, 0);
  const totalBracketWeight = brackets.reduce((sum, b) => sum + b.calculatedWeightKg * b.quantity, 0);
  const totalPlateWeight = plates.reduce((sum, p) => sum + p.calculatedWeightKg * p.quantity, 0);
  const totalBracketCost = brackets.reduce((sum, b) => sum + b.calculatedTotalCost, 0);
  const totalPlateCost = plates.reduce((sum, p) => sum + p.calculatedTotalCost, 0);

  return {
    totalBrackets,
    totalPlates,
    totalBracketWeight: Math.round(totalBracketWeight * 1000) / 1000,
    totalPlateWeight: Math.round(totalPlateWeight * 1000) / 1000,
    totalBracketCost: Math.round(totalBracketCost * 100) / 100,
    totalPlateCost: Math.round(totalPlateCost * 100) / 100,
    grandTotalWeight: Math.round((totalBracketWeight + totalPlateWeight) * 1000) / 1000,
    grandTotalCost: Math.round((totalBracketCost + totalPlateCost) * 100) / 100,
  };
};

export const formatCurrency = (amount: number): string => {
  return `R ${amount.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export const formatWeight = (kg: number): string => {
  return `${kg.toLocaleString('en-ZA', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} kg`;
};

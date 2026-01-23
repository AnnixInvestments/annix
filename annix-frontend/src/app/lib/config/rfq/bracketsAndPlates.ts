export type BracketType = 'L_BRACKET' | 'U_BRACKET' | 'FLAT_BRACKET' | 'CUSTOM';

export interface BracketDimensions {
  leg1LengthMm: number;
  leg2LengthMm: number;
  widthMm: number;
  thicknessMm: number;
  angleDegrees: number;
}

export interface BracketEntry {
  id: string;
  bracketType: BracketType;
  dimensions: BracketDimensions;
  materialId: string;
  costPerKgOverride: number | null;
  quantity: number;
  calculatedWeightKg: number;
  calculatedCostPerUnit: number;
  calculatedTotalCost: number;
  notes?: string;
}

export interface CompensationPlateDimensions {
  lengthMm: number;
  widthMm: number;
  thicknessMm: number;
}

export interface CompensationPlateEntry {
  id: string;
  isCustomSize: boolean;
  standardSizeId: string | null;
  dimensions: CompensationPlateDimensions;
  materialId: string;
  costPerKgOverride: number | null;
  quantity: number;
  calculatedWeightKg: number;
  calculatedCostPerUnit: number;
  calculatedTotalCost: number;
  notes?: string;
}

export interface StandardPlateSize {
  id: string;
  name: string;
  lengthMm: number;
  widthMm: number;
  thicknessMm: number;
  category: 'small' | 'medium' | 'large';
}

export const FALLBACK_STANDARD_PLATE_SIZES: StandardPlateSize[] = [
  { id: 'plate-100x100x5', name: '100 x 100 x 5mm', lengthMm: 100, widthMm: 100, thicknessMm: 5, category: 'small' },
  { id: 'plate-100x100x8', name: '100 x 100 x 8mm', lengthMm: 100, widthMm: 100, thicknessMm: 8, category: 'small' },
  { id: 'plate-100x100x10', name: '100 x 100 x 10mm', lengthMm: 100, widthMm: 100, thicknessMm: 10, category: 'small' },
  { id: 'plate-150x150x8', name: '150 x 150 x 8mm', lengthMm: 150, widthMm: 150, thicknessMm: 8, category: 'small' },
  { id: 'plate-150x150x10', name: '150 x 150 x 10mm', lengthMm: 150, widthMm: 150, thicknessMm: 10, category: 'small' },
  { id: 'plate-150x150x12', name: '150 x 150 x 12mm', lengthMm: 150, widthMm: 150, thicknessMm: 12, category: 'small' },
  { id: 'plate-200x200x10', name: '200 x 200 x 10mm', lengthMm: 200, widthMm: 200, thicknessMm: 10, category: 'medium' },
  { id: 'plate-200x200x12', name: '200 x 200 x 12mm', lengthMm: 200, widthMm: 200, thicknessMm: 12, category: 'medium' },
  { id: 'plate-200x200x15', name: '200 x 200 x 15mm', lengthMm: 200, widthMm: 200, thicknessMm: 15, category: 'medium' },
  { id: 'plate-250x250x12', name: '250 x 250 x 12mm', lengthMm: 250, widthMm: 250, thicknessMm: 12, category: 'medium' },
  { id: 'plate-250x250x15', name: '250 x 250 x 15mm', lengthMm: 250, widthMm: 250, thicknessMm: 15, category: 'medium' },
  { id: 'plate-250x250x20', name: '250 x 250 x 20mm', lengthMm: 250, widthMm: 250, thicknessMm: 20, category: 'medium' },
  { id: 'plate-300x300x15', name: '300 x 300 x 15mm', lengthMm: 300, widthMm: 300, thicknessMm: 15, category: 'large' },
  { id: 'plate-300x300x20', name: '300 x 300 x 20mm', lengthMm: 300, widthMm: 300, thicknessMm: 20, category: 'large' },
  { id: 'plate-300x300x25', name: '300 x 300 x 25mm', lengthMm: 300, widthMm: 300, thicknessMm: 25, category: 'large' },
  { id: 'plate-400x400x20', name: '400 x 400 x 20mm', lengthMm: 400, widthMm: 400, thicknessMm: 20, category: 'large' },
  { id: 'plate-400x400x25', name: '400 x 400 x 25mm', lengthMm: 400, widthMm: 400, thicknessMm: 25, category: 'large' },
  { id: 'plate-500x500x20', name: '500 x 500 x 20mm', lengthMm: 500, widthMm: 500, thicknessMm: 20, category: 'large' },
  { id: 'plate-500x500x25', name: '500 x 500 x 25mm', lengthMm: 500, widthMm: 500, thicknessMm: 25, category: 'large' },
  { id: 'plate-500x500x30', name: '500 x 500 x 30mm', lengthMm: 500, widthMm: 500, thicknessMm: 30, category: 'large' },
];

export const STANDARD_PLATE_SIZES: StandardPlateSize[] = FALLBACK_STANDARD_PLATE_SIZES;

export const BRACKET_TYPES = [
  { id: 'L_BRACKET', name: 'L-Bracket (Angle)', description: 'Standard L-shaped angle bracket for pipe support' },
  { id: 'U_BRACKET', name: 'U-Bracket', description: 'U-shaped bracket for cradling pipes' },
  { id: 'FLAT_BRACKET', name: 'Flat Bracket', description: 'Simple flat mounting plate' },
  { id: 'CUSTOM', name: 'Custom Shape', description: 'Custom bracket configuration' },
] as const;

export const standardPlateSizeById = (id: string): StandardPlateSize | null => {
  return STANDARD_PLATE_SIZES.find((s) => s.id === id) || null;
};

export const standardPlateSizesByCategory = (category: StandardPlateSize['category']): StandardPlateSize[] => {
  return STANDARD_PLATE_SIZES.filter((s) => s.category === category);
};

export const defaultBracketDimensions = (): BracketDimensions => ({
  leg1LengthMm: 100,
  leg2LengthMm: 100,
  widthMm: 50,
  thicknessMm: 6,
  angleDegrees: 90,
});

export const defaultPlateDimensions = (): CompensationPlateDimensions => ({
  lengthMm: 200,
  widthMm: 200,
  thicknessMm: 10,
});

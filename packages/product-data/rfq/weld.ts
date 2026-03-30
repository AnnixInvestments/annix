export interface WeldType {
  id: number;
  weldCode: string;
  weldName: string;
  category: string;
  description: string;
}

export interface WeldThicknessResult {
  found: boolean;
  weldThicknessMm: number | null;
  fittingClass: string | null;
  dn: number;
  odMm: number | null;
  maxPressureBar: number | null;
  temperatureC: number;
  schedule: string;
  notes?: string;
}

export interface PricingInputs {
  steelSpecs: Record<string, number>;
  weldTypes: Record<string, number>;
  flangeTypes: Record<string, number>;
  bnwTypes: Record<string, number>;
  valveTypes: Record<string, number>;
  instrumentTypes: Record<string, number>;
  pumpTypes: Record<string, number>;
  labourExtrasPercent: number;
  contingenciesPercent: number;
}

export interface ExtractedSpecs {
  steelSpecs: string[];
  weldTypes: {
    flangeWeld: boolean;
    mitreWeld: boolean;
    teeWeld: boolean;
    tackWeld: boolean;
    gussetTeeWeld: boolean;
    latWeld45Plus: boolean;
    latWeldUnder45: boolean;
  };
  flangeTypes: {
    slipOn: boolean;
    rotating: boolean;
    blank: boolean;
  };
  bnwGrade: string | null;
  valveTypes: string[];
  instrumentTypes: string[];
  pumpTypes: string[];
}

export interface WeldTotals {
  flangeWeld: number;
  mitreWeld: number;
  teeWeld: number;
  tackWeld: number;
  gussetTeeWeld: number;
  latWeld45Plus: number;
  latWeldUnder45: number;
}

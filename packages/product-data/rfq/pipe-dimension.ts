export interface NominalOutsideDiameter {
  id: number;
  nominal_diameter_mm: number;
  outside_diameter_mm: number;
}

export interface SteelSpecification {
  id: number;
  steelSpecName: string;
}

export interface PipeDimension {
  id: number;
  wallThicknessMm: number;
  internalDiameterMm?: number;
  massKgm: number;
  scheduleDesignation?: string;
  scheduleNumber?: number;
  nominalOutsideDiameter: NominalOutsideDiameter;
  steelSpecification: SteelSpecification;
}

export interface PipePressure {
  id: number;
  temperatureC?: number;
  maxWorkingPressureMpa?: number;
  allowableStressMpa: number;
}

export interface PipeEndConfiguration {
  id: number;
  configCode: string;
  configName: string;
  description: string;
  weldCount: number;
}

export interface PipeWallThicknessResult {
  found: boolean;
  wallThicknessMm: number | null;
  maxPressureBar: number | null;
  schedule: string;
  dn: number;
  temperatureC: number;
}

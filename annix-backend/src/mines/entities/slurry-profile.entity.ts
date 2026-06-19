import { Commodity } from "./commodity.entity";

export enum RiskLevel {
  LOW = "Low",
  MEDIUM = "Medium",
  HIGH = "High",
  VERY_HIGH = "Very High",
}

export class SlurryProfile {
  id: number;

  commodity: Commodity;

  commodityId: number;

  profileName: string | null;

  // Specific Gravity (SG) range
  typicalSgMin: number;

  typicalSgMax: number;

  // Solids concentration (% w/w)
  solidsConcentrationMin: number;

  solidsConcentrationMax: number;

  // pH range
  phMin: number;

  phMax: number;

  // Temperature range (°C)
  tempMin: number;

  tempMax: number;

  // Risk levels
  abrasionRisk: RiskLevel;

  corrosionRisk: RiskLevel;

  primaryFailureMode: string | null;

  notes: string | null;
}

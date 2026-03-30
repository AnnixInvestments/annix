export interface Commodity {
  id: number;
  commodityName: string;
  typicalProcessRoute: string | null;
  applicationNotes: string | null;
}

export interface SaMine {
  id: number;
  mineName: string;
  operatingCompany: string;
  commodityId: number;
  commodityName?: string;
  province: string;
  district: string | null;
  physicalAddress: string | null;
  mineType: "Underground" | "Open Cast" | "Both";
  operationalStatus: "Active" | "Care and Maintenance" | "Closed";
  latitude: number | null;
  longitude: number | null;
}

export interface SlurryProfile {
  id: number;
  commodityId: number;
  commodityName?: string;
  profileName: string | null;
  typicalSgMin: number;
  typicalSgMax: number;
  solidsConcentrationMin: number;
  solidsConcentrationMax: number;
  phMin: number;
  phMax: number;
  tempMin: number;
  tempMax: number;
  abrasionRisk: "Low" | "Medium" | "High" | "Very High";
  corrosionRisk: "Low" | "Medium" | "High" | "Very High";
  primaryFailureMode: string | null;
  notes: string | null;
}

export interface LiningCoatingRule {
  id: number;
  abrasionLevel: "Low" | "Medium" | "High" | "Very High";
  corrosionLevel: "Low" | "Medium" | "High" | "Very High";
  recommendedLining: string;
  recommendedCoating: string | null;
  applicationNotes: string | null;
  priority: number;
}

export interface MineWithEnvironmentalData {
  mine: SaMine;
  slurryProfile: SlurryProfile | null;
  liningRecommendation: LiningCoatingRule | null;
}

export interface CreateSaMineDto {
  mineName: string;
  operatingCompany: string;
  commodityId: number;
  province: string;
  district?: string;
  physicalAddress?: string;
  mineType?: "Underground" | "Open Cast" | "Both";
  operationalStatus?: "Active" | "Care and Maintenance" | "Closed";
  latitude?: number;
  longitude?: number;
}

export const TRADE_KEYS = [
  "boilermaker",
  "coded_welder",
  "rubber_liner",
  "pipe_fitter",
  "diesel_mechanic",
  "rigger",
  "electrician",
] as const;

export type TradeKey = (typeof TRADE_KEYS)[number];

export const TRADE_LABELS: Record<TradeKey, string> = {
  boilermaker: "Boilermaker",
  coded_welder: "Coded Welder",
  rubber_liner: "Rubber Liner",
  pipe_fitter: "Pipe Fitter",
  diesel_mechanic: "Diesel Mechanic",
  rigger: "Rigger",
  electrician: "Electrician",
};

export const COMMODITIES = [
  "gold",
  "coal",
  "platinum",
  "iron_ore",
  "manganese",
  "chrome",
  "copper",
  "diamond",
  "uranium",
  "nickel",
] as const;

export type Commodity = (typeof COMMODITIES)[number];

export const COMMODITY_LABELS: Record<Commodity, string> = {
  gold: "Gold",
  coal: "Coal",
  platinum: "Platinum",
  iron_ore: "Iron Ore",
  manganese: "Manganese",
  chrome: "Chrome",
  copper: "Copper",
  diamond: "Diamond",
  uranium: "Uranium",
  nickel: "Nickel",
};

export const AVAILABILITY_VALUES = [
  "available_now",
  "14d_notice",
  "30d_notice",
  "not_currently",
] as const;

export type Availability = (typeof AVAILABILITY_VALUES)[number];

export const AVAILABILITY_LABELS: Record<Availability, string> = {
  available_now: "Available now",
  "14d_notice": "14 days notice",
  "30d_notice": "30 days notice",
  not_currently: "Not currently available",
};

export interface ShutdownEntry {
  siteName: string;
  role: string;
  durationDays: number;
  year: number;
}

export interface SharedTradeFields {
  tradeKeys: TradeKey[];
  yearsExperience: number | null;
  commoditiesWorked: Commodity[];
  shutdownHistory: ShutdownEntry[];
  siteRadiusKm: number | null;
  availability: Availability | null;
}

export interface BoilermakerProfile {
  codedTickets: string[];
  pressureVesselExperience: boolean;
  specialisations: string[];
}

export interface CodedWelderProfile {
  processes: string[];
  positions: string[];
  materialsCoded: string[];
  thicknessMinMm: number | null;
  thicknessMaxMm: number | null;
  saqccCertificateNumber: string | null;
  saqccValidUntil: string | null;
}

export interface RubberLinerProfile {
  linerCertifications: string[];
  chuteAndMillExperience: boolean;
  adhesiveSystemsUsed: string[];
  maxVesselSizeM3: number | null;
}

export interface PipeFitterProfile {
  pipeSpecExperience: string[];
  maxDiameterMm: number | null;
  flangeBoltingTorqueCert: boolean;
  weldFitupExperience: boolean;
}

export interface DieselMechanicProfile {
  enginesWorked: string[];
  vehiclesWorked: string[];
  electronicDiagnosticsTools: string[];
  mineFleetExperience: boolean;
}

export type RiggerClass = "rigger" | "rigger_intermediate" | "rigger_advanced";

export interface RiggerProfile {
  riggerClass: RiggerClass | null;
  maxLiftWeightTons: number | null;
  mobileCraneExperience: boolean;
  towerCraneExperience: boolean;
}

export type CompetencyVoltage = "lv" | "mv" | "hv";

export interface ElectricianProfile {
  section13Certificate: boolean;
  competencyVoltage: CompetencyVoltage | null;
  specialClasses: string[];
  mineHealthSafetyCert: boolean;
}

export interface PerTradeProfiles {
  boilermaker?: BoilermakerProfile;
  coded_welder?: CodedWelderProfile;
  rubber_liner?: RubberLinerProfile;
  pipe_fitter?: PipeFitterProfile;
  diesel_mechanic?: DieselMechanicProfile;
  rigger?: RiggerProfile;
  electrician?: ElectricianProfile;
}

export interface TradeProfile {
  shared: SharedTradeFields;
  perTrade: PerTradeProfiles;
}

export function emptyTradeProfile(): TradeProfile {
  return {
    shared: {
      tradeKeys: [],
      yearsExperience: null,
      commoditiesWorked: [],
      shutdownHistory: [],
      siteRadiusKm: null,
      availability: null,
    },
    perTrade: {},
  };
}

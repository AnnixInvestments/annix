import { Commodity } from "./commodity.entity";

export enum CountryMineType {
  UNDERGROUND = "Underground",
  OPEN_CAST = "Open Cast",
  BOTH = "Both",
}

export enum CountryOperationalStatus {
  ACTIVE = "Active",
  CARE_AND_MAINTENANCE = "Care and Maintenance",
  CLOSED = "Closed",
  PROPOSED = "Proposed",
}

export enum ClimateZone {
  ARID = "Arid",
  SEMI_ARID = "Semi-arid",
  TROPICAL = "Tropical",
  SUBTROPICAL = "Subtropical",
  TEMPERATE = "Temperate",
  HIGHVELD = "Highveld",
}

export enum RoadAccessQuality {
  GOOD = "Good",
  FAIR = "Fair",
  POOR = "Poor",
  DIFFICULT = "Difficult",
}

/**
 * Shared columns for every country-mine table (botswana_mines, namibia_mines,
 * zimbabwe_mines, zambia_mines, mozambique_mines). Each concrete entity
 * extends this and only adds its own @Entity("<country>_mines") tag — keeps
 * the schema in lock-step across countries so the inference + RFQ tools
 * can iterate them uniformly via MineRegistryService.
 *
 * Country is implied by the table name (so we don't store it on the row).
 * Captures the data quoting and inference both need: location, climate,
 * logistics, utilities — anything that affects what / how we quote at
 * that mine.
 */
export abstract class CountryMineBase {
  id: number;

  mineName: string;

  operatingCompany: string;

  // Free-form alias list for fuzzy mine-inference (Phase 2 of
  // issue #264). Each entry is a project name / doc-number prefix /
  // colloquial identifier that should also match this mine. See
  // SaMine for the canonical comment.
  aliases: string[];

  commodity?: Commodity;

  commodityId?: number;

  region?: string;

  district?: string;

  nearestTown?: string;

  physicalAddress?: string;

  latitude?: number;

  longitude?: number;

  elevationM?: number;

  mineType: CountryMineType;

  operationalStatus: CountryOperationalStatus;

  climateZone?: ClimateZone;

  annualRainfallMm?: number;

  meanTempMinC?: number;

  meanTempMaxC?: number;

  humidityAvgPercent?: number;

  terrainType?: string;

  distanceToNearestPortKm?: number;

  nearestPort?: string;

  distanceToCapitalKm?: number;

  roadAccessQuality?: RoadAccessQuality;

  primaryWaterSource?: string;

  primaryPowerSource?: string;

  environmentalConcerns?: string;

  notes?: string;

  createdAt: Date;

  updatedAt: Date;
}

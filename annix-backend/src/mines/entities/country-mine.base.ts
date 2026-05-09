import {
  Column,
  CreateDateColumn,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
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
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "mine_name", type: "varchar", length: 255 })
  mineName: string;

  @Column({ name: "operating_company", type: "varchar", length: 255 })
  operatingCompany: string;

  @ManyToOne(
    () => Commodity,
    (commodity) => commodity.mines,
    { nullable: true },
  )
  @JoinColumn({ name: "commodity_id" })
  commodity?: Commodity;

  @Column({ name: "commodity_id", nullable: true })
  commodityId?: number;

  @Column({ name: "region", type: "varchar", length: 100, nullable: true })
  region?: string;

  @Column({ name: "district", type: "varchar", length: 255, nullable: true })
  district?: string;

  @Column({ name: "nearest_town", type: "varchar", length: 100, nullable: true })
  nearestTown?: string;

  @Column({ name: "physical_address", type: "text", nullable: true })
  physicalAddress?: string;

  @Column({
    name: "latitude",
    type: "decimal",
    precision: 10,
    scale: 7,
    nullable: true,
  })
  latitude?: number;

  @Column({
    name: "longitude",
    type: "decimal",
    precision: 10,
    scale: 7,
    nullable: true,
  })
  longitude?: number;

  @Column({ name: "elevation_m", type: "int", nullable: true })
  elevationM?: number;

  @Column({
    name: "mine_type",
    type: "enum",
    enum: CountryMineType,
    default: CountryMineType.UNDERGROUND,
  })
  mineType: CountryMineType;

  @Column({
    name: "operational_status",
    type: "enum",
    enum: CountryOperationalStatus,
    default: CountryOperationalStatus.ACTIVE,
  })
  operationalStatus: CountryOperationalStatus;

  @Column({
    name: "climate_zone",
    type: "enum",
    enum: ClimateZone,
    nullable: true,
  })
  climateZone?: ClimateZone;

  @Column({ name: "annual_rainfall_mm", type: "int", nullable: true })
  annualRainfallMm?: number;

  @Column({
    name: "mean_temp_min_c",
    type: "decimal",
    precision: 4,
    scale: 1,
    nullable: true,
  })
  meanTempMinC?: number;

  @Column({
    name: "mean_temp_max_c",
    type: "decimal",
    precision: 4,
    scale: 1,
    nullable: true,
  })
  meanTempMaxC?: number;

  @Column({
    name: "humidity_avg_percent",
    type: "decimal",
    precision: 4,
    scale: 1,
    nullable: true,
  })
  humidityAvgPercent?: number;

  @Column({ name: "terrain_type", type: "varchar", length: 100, nullable: true })
  terrainType?: string;

  @Column({ name: "distance_to_nearest_port_km", type: "int", nullable: true })
  distanceToNearestPortKm?: number;

  @Column({ name: "nearest_port", type: "varchar", length: 100, nullable: true })
  nearestPort?: string;

  @Column({ name: "distance_to_capital_km", type: "int", nullable: true })
  distanceToCapitalKm?: number;

  @Column({
    name: "road_access_quality",
    type: "enum",
    enum: RoadAccessQuality,
    nullable: true,
  })
  roadAccessQuality?: RoadAccessQuality;

  @Column({ name: "primary_water_source", type: "varchar", length: 100, nullable: true })
  primaryWaterSource?: string;

  @Column({ name: "primary_power_source", type: "varchar", length: 100, nullable: true })
  primaryPowerSource?: string;

  @Column({ name: "environmental_concerns", type: "text", nullable: true })
  environmentalConcerns?: string;

  @Column({ name: "notes", type: "text", nullable: true })
  notes?: string;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}

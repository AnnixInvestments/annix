import { Commodity } from "./commodity.entity";

export enum MineType {
  UNDERGROUND = "Underground",
  OPEN_CAST = "Open Cast",
  BOTH = "Both",
}

export enum OperationalStatus {
  ACTIVE = "Active",
  CARE_AND_MAINTENANCE = "Care and Maintenance",
  CLOSED = "Closed",
}

export class SaMine {
  id: number;

  mineName: string;

  operatingCompany: string;

  // Free-form alias list for fuzzy mine-inference. Each entry is a
  // project name / doc-number prefix / colloquial identifier that
  // should also match this mine. e.g. Mogalakwena's aliases include
  // "Blinkwater 2" (the TSF on the mine), "JW559" (Jones & Wagener
  // consultant project code), "J528" (drawing prefix). Stored as a
  // PostgreSQL text array so SQL `= ANY(aliases)` or LIKE matching
  // is direct without a join table. Phase 2 of issue #264.
  aliases: string[];

  commodity: Commodity;

  commodityId: number;

  province: string;

  district: string | null;

  physicalAddress: string | null;

  mineType: MineType;

  operationalStatus: OperationalStatus;

  latitude: number | null;

  longitude: number | null;

  createdAt: Date;

  updatedAt: Date;
}

import { OccupationalLevel } from "./job-posting.entity";

export enum EeTargetMetric {
  RACE_AFRICAN_BLACK = "race_african_black",
  RACE_COLOURED = "race_coloured",
  RACE_INDIAN = "race_indian",
  FEMALE = "female",
  DISABILITY = "disability",
}

export type EeTargetOccupationalLevel = OccupationalLevel | "all_levels";

export class AnnixOrbitEeSectoralTarget {
  id: number;

  sectorCode: string;

  occupationalLevel: EeTargetOccupationalLevel;

  targetYear: number;

  targetMetric: EeTargetMetric;

  targetPercent: string;

  gazetteReference: string | null;

  createdAt: Date;
}

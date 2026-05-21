import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from "typeorm";
import { OccupationalLevel } from "./job-posting.entity";

export enum EeTargetMetric {
  RACE_AFRICAN_BLACK = "race_african_black",
  RACE_COLOURED = "race_coloured",
  RACE_INDIAN = "race_indian",
  FEMALE = "female",
  DISABILITY = "disability",
}

export type EeTargetOccupationalLevel = OccupationalLevel | "all_levels";

@Entity("cv_assistant_ee_sectoral_targets")
export class AnnixOrbitEeSectoralTarget {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "sector_code", type: "varchar", length: 100 })
  sectorCode: string;

  @Column({ name: "occupational_level", type: "varchar", length: 40 })
  occupationalLevel: EeTargetOccupationalLevel;

  @Column({ name: "target_year", type: "int" })
  targetYear: number;

  @Column({ name: "target_metric", type: "varchar", length: 40 })
  targetMetric: EeTargetMetric;

  @Column({ name: "target_percent", type: "numeric", precision: 5, scale: 2 })
  targetPercent: string;

  @Column({ name: "gazette_reference", type: "varchar", length: 255, nullable: true })
  gazetteReference: string | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;
}

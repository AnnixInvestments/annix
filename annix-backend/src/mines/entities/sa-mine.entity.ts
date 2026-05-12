import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
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

@Entity("sa_mines")
@Index(["province"])
@Index(["operationalStatus"])
export class SaMine {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "mine_name", type: "varchar", length: 255 })
  mineName: string;

  @Column({ name: "operating_company", type: "varchar", length: 255 })
  operatingCompany: string;

  // Free-form alias list for fuzzy mine-inference. Each entry is a
  // project name / doc-number prefix / colloquial identifier that
  // should also match this mine. e.g. Mogalakwena's aliases include
  // "Blinkwater 2" (the TSF on the mine), "JW559" (Jones & Wagener
  // consultant project code), "J528" (drawing prefix). Stored as a
  // PostgreSQL text array so SQL `= ANY(aliases)` or LIKE matching
  // is direct without a join table. Phase 2 of issue #264.
  @Column({ name: "aliases", type: "text", array: true, default: () => "ARRAY[]::text[]" })
  aliases: string[];

  @ManyToOne(
    () => Commodity,
    (commodity) => commodity.mines,
  )
  @JoinColumn({ name: "commodity_id" })
  commodity: Commodity;

  @Column({ name: "commodity_id" })
  commodityId: number;

  @Column({ name: "province", type: "varchar", length: 100 })
  province: string;

  @Column({ name: "district", type: "varchar", length: 255, nullable: true })
  district: string | null;

  @Column({ name: "physical_address", type: "text", nullable: true })
  physicalAddress: string | null;

  @Column({
    name: "mine_type",
    type: "enum",
    enum: MineType,
    default: MineType.UNDERGROUND,
  })
  mineType: MineType;

  @Column({
    name: "operational_status",
    type: "enum",
    enum: OperationalStatus,
    default: OperationalStatus.ACTIVE,
  })
  operationalStatus: OperationalStatus;

  @Column({
    name: "latitude",
    type: "decimal",
    precision: 10,
    scale: 7,
    nullable: true,
  })
  latitude: number | null;

  @Column({
    name: "longitude",
    type: "decimal",
    precision: 10,
    scale: 7,
    nullable: true,
  })
  longitude: number | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}

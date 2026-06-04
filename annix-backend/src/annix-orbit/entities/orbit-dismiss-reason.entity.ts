import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

// When a seeker dismisses a job with this reason, optionally apply a strong
// filter as well: "company" mutes that job's company, "category" mutes its
// category. null = no deterministic filter (the dismissal still feeds the
// semantic learning penalty).
export type DismissReasonMuteAction = "company" | "category";

@Entity("orbit_dismiss_reasons")
@Index("idx_orbit_dismiss_reasons_code", ["code"], { unique: true })
export class OrbitDismissReason {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "code", type: "varchar", length: 50 })
  code: string;

  @Column({ name: "label", type: "varchar", length: 120 })
  label: string;

  @Column({ name: "mute_action", type: "varchar", length: 20, nullable: true })
  muteAction: DismissReasonMuteAction | null;

  @Column({ name: "sort_order", type: "int", default: 0 })
  sortOrder: number;

  @Column({ name: "active", type: "boolean", default: true })
  active: boolean;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}

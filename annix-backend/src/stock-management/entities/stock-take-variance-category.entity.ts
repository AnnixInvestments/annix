import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from "typeorm";

export type VarianceCategorySeverity = "low" | "medium" | "high" | "critical";

@Entity("sm_stock_take_variance_category")
@Unique(["companyId", "slug"])
export class StockTakeVarianceCategory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "company_id", type: "integer" })
  companyId: number;

  @Column({ name: "slug", type: "varchar", length: 64 })
  slug: string;

  @Column({ name: "name", type: "varchar", length: 128 })
  name: string;

  @Column({ name: "description", type: "text", nullable: true })
  description: string | null;

  @Column({ name: "sort_order", type: "integer", default: 100 })
  sortOrder: number;

  @Column({ name: "requires_photo", type: "boolean", default: false })
  requiresPhoto: boolean;

  @Column({ name: "requires_incident_ref", type: "boolean", default: false })
  requiresIncidentRef: boolean;

  @Column({ name: "notify_on_submit", type: "text", array: true, default: () => "ARRAY[]::TEXT[]" })
  notifyOnSubmit: string[];

  @Column({ name: "severity", type: "varchar", length: 16, default: "low" })
  severity: VarianceCategorySeverity;

  @Column({ name: "active", type: "boolean", default: true })
  active: boolean;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}

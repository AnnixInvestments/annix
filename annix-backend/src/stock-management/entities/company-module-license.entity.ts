import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from "typeorm";
import type { StockManagementTier } from "../config/stock-management-features.constants";

@Entity("sm_company_module_license")
@Unique(["companyId", "moduleKey"])
export class CompanyModuleLicense {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "company_id", type: "integer" })
  companyId: number;

  @Column({ name: "module_key", type: "varchar", length: 64, default: "stock-management" })
  moduleKey: string;

  @Column({ name: "tier", type: "varchar", length: 32, default: "basic" })
  tier: StockManagementTier;

  @Column({ name: "feature_overrides", type: "jsonb", default: () => "'{}'::jsonb" })
  featureOverrides: Record<string, boolean>;

  @Column({ name: "valid_from", type: "timestamptz", nullable: true })
  validFrom: Date | null;

  @Column({ name: "valid_until", type: "timestamptz", nullable: true })
  validUntil: Date | null;

  @Column({ name: "active", type: "boolean", default: true })
  active: boolean;

  @Column({ name: "notes", type: "text", nullable: true })
  notes: string | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}

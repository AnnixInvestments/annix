import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from "typeorm";

export interface TierPricingOverride {
  name?: string;
  description?: string;
  monthlyPriceCents?: number;
  annualPriceCents?: number;
  includedSeats?: number;
  aiDocAllowance?: number;
  visibility?: string;
}

export interface AddOnOverride {
  label?: string;
  description?: string;
  monthlyPriceCents?: number;
  discountable?: boolean;
}

@Entity("module_catalog_override")
@Unique(["moduleKey"])
export class ModuleCatalogOverride {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "module_key", type: "varchar", length: 64 })
  moduleKey: string;

  @Column({ name: "tier_overrides", type: "jsonb", default: () => "'{}'::jsonb" })
  tierOverrides: Record<string, TierPricingOverride>;

  @Column({ name: "tier_features", type: "jsonb", default: () => "'{}'::jsonb" })
  tierFeatures: Record<string, string[]>;

  @Column({ name: "add_on_overrides", type: "jsonb", default: () => "'{}'::jsonb" })
  addOnOverrides: Record<string, AddOnOverride>;

  @Column({ name: "updated_by_id", type: "integer", nullable: true })
  updatedById: number | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}

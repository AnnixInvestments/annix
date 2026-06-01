import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from "typeorm";

export type PromoDiscountType = "percentage" | "fixed_amount";
export type PromoBillingCycle = "monthly" | "annual" | "any";
export type PromoDiscountDuration = "first_payment" | "n_months" | "forever";

@Entity("promo_code")
@Unique(["code"])
export class PromoCode {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "varchar", length: 64 })
  code: string;

  @Column({ type: "varchar", length: 200, default: "" })
  description: string;

  @Column({ name: "module_key", type: "varchar", length: 64, nullable: true })
  moduleKey: string | null;

  @Column({ name: "discount_type", type: "varchar", length: 16 })
  discountType: PromoDiscountType;

  @Column({ name: "discount_value", type: "integer" })
  discountValue: number;

  @Column({ name: "applies_to_tiers", type: "jsonb", default: () => "'[]'::jsonb" })
  appliesToTiers: string[];

  @Column({ name: "assigned_company_ids", type: "jsonb", default: () => "'[]'::jsonb" })
  assignedCompanyIds: number[];

  @Column({ name: "billing_cycle", type: "varchar", length: 16, default: "any" })
  billingCycle: PromoBillingCycle;

  @Column({ name: "discount_duration", type: "varchar", length: 16, default: "first_payment" })
  discountDuration: PromoDiscountDuration;

  @Column({ name: "duration_months", type: "integer", nullable: true })
  durationMonths: number | null;

  @Column({ name: "grants_tier", type: "varchar", length: 64, nullable: true })
  grantsTier: string | null;

  @Column({ name: "max_redemptions", type: "integer", nullable: true })
  maxRedemptions: number | null;

  @Column({ name: "times_redeemed", type: "integer", default: 0 })
  timesRedeemed: number;

  @Column({ name: "valid_from", type: "timestamptz", nullable: true })
  validFrom: Date | null;

  @Column({ name: "valid_until", type: "timestamptz", nullable: true })
  validUntil: Date | null;

  @Column({ type: "boolean", default: true })
  active: boolean;

  @Column({ name: "created_by_id", type: "integer", nullable: true })
  createdById: number | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}

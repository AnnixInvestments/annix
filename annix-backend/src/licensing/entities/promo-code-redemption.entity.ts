import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, Unique } from "typeorm";

@Entity("promo_code_redemption")
@Unique(["promoCodeId", "companyId"])
export class PromoCodeRedemption {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "promo_code_id", type: "integer" })
  promoCodeId: number;

  @Column({ name: "company_id", type: "integer" })
  companyId: number;

  @Column({ name: "subscription_id", type: "integer", nullable: true })
  subscriptionId: number | null;

  @Column({ name: "discount_applied_cents", type: "integer", default: 0 })
  discountAppliedCents: number;

  @CreateDateColumn({ name: "redeemed_at" })
  redeemedAt: Date;
}

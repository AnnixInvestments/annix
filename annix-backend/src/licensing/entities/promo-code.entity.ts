export type PromoDiscountType = "percentage" | "fixed_amount";
export type PromoBillingCycle = "monthly" | "annual" | "any";
export type PromoDiscountDuration = "first_payment" | "n_months" | "forever";

export class PromoCode {
  id: number;

  code: string;

  description: string;

  moduleKey: string | null;

  discountType: PromoDiscountType;

  discountValue: number;

  appliesToTiers: string[];

  assignedCompanyIds: number[];

  billingCycle: PromoBillingCycle;

  discountDuration: PromoDiscountDuration;

  durationMonths: number | null;

  grantsTier: string | null;

  maxRedemptions: number | null;

  timesRedeemed: number;

  validFrom: Date | null;

  validUntil: Date | null;

  active: boolean;

  createdById: number | null;

  createdAt: Date;

  updatedAt: Date;
}

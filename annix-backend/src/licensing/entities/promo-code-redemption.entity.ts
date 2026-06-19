export class PromoCodeRedemption {
  id: number;

  promoCodeId: number;

  companyId: number;

  subscriptionId: number | null;

  discountAppliedCents: number;

  redeemedAt: Date;
}

export const SEEKER_BILLING_EVENT_TYPES = [
  "checkout_initialized",
  "charge_success",
  "subscription_create",
  "subscription_disable",
  "subscription_not_renew",
  "invoice_payment_failed",
  "subscription_cancel_requested",
] as const;

export type SeekerBillingEventType = (typeof SEEKER_BILLING_EVENT_TYPES)[number];

export class SeekerBillingEvent {
  id: number;

  userId: number;

  type: SeekerBillingEventType;

  paystackReference: string | null;

  paystackEventId: string | null;

  amountMinor: number | null;

  currency: string;

  rawPayload: Record<string, unknown> | null;

  createdAt: Date;

  updatedAt: Date;
}

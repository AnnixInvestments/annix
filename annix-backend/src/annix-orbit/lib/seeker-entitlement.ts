import {
  DEFAULT_MATCH_TIER,
  isMatchTier,
  MATCH_TIERS,
  type MatchTier,
} from "@annix/product-data/sa-market";

export function highestTier(tiers: Array<string | null | undefined>): string {
  const ranks = tiers.map((tier) => MATCH_TIERS.indexOf((tier ?? "") as MatchTier));
  const best = Math.max(-1, ...ranks);
  return best >= 0 ? MATCH_TIERS[best] : DEFAULT_MATCH_TIER;
}

export const ORBIT_BILLING_STATUSES = ["none", "trialing", "active", "past_due"] as const;

export type OrbitBillingStatus = (typeof ORBIT_BILLING_STATUSES)[number];

export function isOrbitBillingStatus(
  value: string | null | undefined,
): value is OrbitBillingStatus {
  return (ORBIT_BILLING_STATUSES as readonly string[]).includes(value ?? "");
}

export interface SeekerEntitlementInputs {
  requestedTier: string | null;
  trialTier: string | null;
  trialEndsAt: Date | null;
  entitledTier: string | null;
  billingStatus: OrbitBillingStatus | null;
  paidUntil: Date | null;
  enforced: boolean;
  nowMillis: number;
}

function trialActive(trialTier: string | null, trialEndsAt: Date | null, nowMs: number): boolean {
  return trialTier != null && trialEndsAt != null && trialEndsAt.getTime() > nowMs;
}

function billingActive(
  billingStatus: OrbitBillingStatus | null,
  paidUntil: Date | null,
  nowMs: number,
): boolean {
  return billingStatus === "active" || (paidUntil != null && paidUntil.getTime() > nowMs);
}

export function resolveEntitledTier(inputs: SeekerEntitlementInputs): string {
  if (trialActive(inputs.trialTier, inputs.trialEndsAt, inputs.nowMillis)) {
    return inputs.trialTier as string;
  }
  if (!inputs.enforced) {
    return inputs.requestedTier ?? DEFAULT_MATCH_TIER;
  }
  if (billingActive(inputs.billingStatus, inputs.paidUntil, inputs.nowMillis)) {
    return inputs.entitledTier != null && isMatchTier(inputs.entitledTier)
      ? inputs.entitledTier
      : DEFAULT_MATCH_TIER;
  }
  return DEFAULT_MATCH_TIER;
}

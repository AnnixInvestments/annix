export function isAnnixOrbitBillingEnforced(): boolean {
  return process.env.ORBIT_BILLING_ENFORCED === "true";
}

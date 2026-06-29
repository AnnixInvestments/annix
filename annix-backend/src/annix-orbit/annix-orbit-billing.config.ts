export const ORBIT_BILLING_MODULES = ["seeker", "company", "recruiter", "student"] as const;

export type OrbitBillingModule = (typeof ORBIT_BILLING_MODULES)[number];

const BILLING_ENV_KEYS: Record<OrbitBillingModule, string> = {
  seeker: "ORBIT_SEEKER_BILLING_ENABLED",
  company: "ORBIT_COMPANY_BILLING_ENABLED",
  recruiter: "ORBIT_RECRUITER_BILLING_ENABLED",
  student: "ORBIT_STUDENT_BILLING_ENABLED",
};

export function isOrbitBillingModule(value: string): value is OrbitBillingModule {
  return (ORBIT_BILLING_MODULES as readonly string[]).includes(value);
}

export function defaultOrbitBillingEnabled(module: OrbitBillingModule): boolean {
  return process.env[BILLING_ENV_KEYS[module]] === "true";
}

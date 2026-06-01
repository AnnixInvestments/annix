export interface EeDisclosurePolicy {
  policyVersion: string;
  retentionYears: number;
  eeaReturnMinimumYears: number;
  eePlanRetentionBasis: string;
}

export const EE_DISCLOSURE_POLICY: EeDisclosurePolicy = {
  policyVersion: "2026-06",
  retentionYears: 5,
  eeaReturnMinimumYears: 3,
  eePlanRetentionBasis: "the duration of the employer's Employment Equity plan",
};

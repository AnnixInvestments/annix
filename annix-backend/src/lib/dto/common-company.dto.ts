export enum CompanySize {
  MICRO = "micro",
  SMALL = "small",
  MEDIUM = "medium",
  LARGE = "large",
  ENTERPRISE = "enterprise",
}

export const COMPANY_SIZE_VALUES = [
  CompanySize.MICRO,
  CompanySize.SMALL,
  CompanySize.MEDIUM,
  CompanySize.LARGE,
  CompanySize.ENTERPRISE,
] as const;

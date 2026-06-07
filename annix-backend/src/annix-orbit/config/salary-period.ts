import { JobSourceProvider } from "../entities/job-market-source.entity";

export type SalaryPeriod = "year" | "month";

// The period each provider quotes salaries in. Aggregators that annualise pay
// ("per annum") → "year"; SA job boards that quote take-home → "month". Providers
// not listed (e.g. AI-crawled portals) fall through to the magnitude heuristic.
const PROVIDER_PERIOD: Partial<Record<string, SalaryPeriod>> = {
  [JobSourceProvider.ADZUNA]: "year",
  [JobSourceProvider.CAREERJET]: "year",
  [JobSourceProvider.REMOTIVE]: "year",
  [JobSourceProvider.JOOBLE]: "year",
  [JobSourceProvider.DPSA]: "year",
  [JobSourceProvider.EXECUTIVE_PLACEMENTS]: "month",
  [JobSourceProvider.JOB_PLACEMENTS]: "month",
  [JobSourceProvider.JOBMAIL]: "month",
  [JobSourceProvider.CAREERJUNCTION]: "month",
};

// A single ZAR figure at/above this is almost certainly an annual package (a
// monthly salary this high is rare); well below it is almost certainly monthly.
const ANNUAL_MAGNITUDE_FLOOR = 120_000;
const MONTHLY_MAGNITUDE_CEILING = 5_000;

export interface MonthlySalary {
  salaryPeriod: SalaryPeriod | null;
  salaryMonthlyMin: number | null;
  salaryMonthlyMax: number | null;
}

// Detect the period a job's salary is quoted in and normalise it to monthly.
// Trusts the provider's known period but lets an implausible magnitude override
// it (a "month" source showing R500k is really annual; a "year" source showing
// R3k is really monthly).
export function resolveMonthlySalary(
  provider: string | null,
  salaryMin: number | null,
  salaryMax: number | null,
): MonthlySalary {
  if (salaryMin == null && salaryMax == null) {
    return { salaryPeriod: null, salaryMonthlyMin: null, salaryMonthlyMax: null };
  }
  const rawReference = salaryMax ?? salaryMin;
  const reference = rawReference != null ? Number(rawReference) : 0;
  const known = provider ? PROVIDER_PERIOD[provider] : undefined;

  let period: SalaryPeriod;
  if (known === "month" && reference >= ANNUAL_MAGNITUDE_FLOOR) {
    period = "year";
  } else if (known === "year" && reference > 0 && reference < MONTHLY_MAGNITUDE_CEILING) {
    period = "month";
  } else if (known) {
    period = known;
  } else {
    period = reference >= ANNUAL_MAGNITUDE_FLOOR ? "year" : "month";
  }

  const divisor = period === "year" ? 12 : 1;
  const toMonthly = (value: number | null): number | null =>
    value == null ? null : Math.round(Number(value) / divisor);

  return {
    salaryPeriod: period,
    salaryMonthlyMin: toMonthly(salaryMin),
    salaryMonthlyMax: toMonthly(salaryMax),
  };
}

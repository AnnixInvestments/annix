import { Injectable } from "@nestjs/common";
import { now } from "../lib/datetime";

export interface MinimumWageResult {
  compliant: boolean;
  minimumWage: number;
  shortfall: number | null;
  overtimeRate: number;
}

export interface VatAssessmentResult {
  mustRegister: boolean;
  canVoluntaryRegister: boolean;
  threshold: number;
  voluntaryThreshold: number;
}

export interface TurnoverTaxResult {
  eligible: boolean;
  estimatedTax: number;
  effectiveRate: number;
}

export interface CorporateTaxResult {
  tax: number;
  rate: number;
}

export interface SdlResult {
  applicable: boolean;
  amount: number;
  threshold: number;
}

export interface UifResult {
  employeeContribution: number;
  employerContribution: number;
  total: number;
  ceiling: number;
  capped: boolean;
}

export interface TaxCalendarEntry {
  name: string;
  date: string;
  type: string;
  description: string;
}

interface SetaGrantDeadline {
  name: string;
  date: string;
}

export interface SetaGrantInfo {
  mandatoryGrant: { percentage: number; description: string };
  discretionaryGrant: { percentage: string; description: string };
  pivotalGrant: { percentage: string; description: string };
  deadlines: SetaGrantDeadline[];
  steps: string[];
}

const MINIMUM_WAGE_HOURLY = 30.23;
const VAT_REGISTRATION_THRESHOLD = 2_300_000;
const VAT_VOLUNTARY_THRESHOLD = 120_000;
const TURNOVER_TAX_BRACKET_1 = 600_000;
const TURNOVER_TAX_BRACKET_2 = 1_000_000;
const TURNOVER_TAX_BRACKET_3 = 1_500_000;
const TURNOVER_TAX_RATE_1 = 0.01;
const TURNOVER_TAX_RATE_2 = 0.02;
const TURNOVER_TAX_RATE_3 = 0.03;
const TURNOVER_TAX_BASE_2 = 4_000;
const TURNOVER_TAX_BASE_3 = 14_000;
const CORPORATE_TAX_RATE = 0.27;
const SDL_THRESHOLD = 500_000;
const SDL_RATE = 0.01;
const UIF_CEILING = 17_712;
const UIF_RATE = 0.01;
const OVERTIME_MULTIPLIER = 1.5;

@Injectable()
export class ComplySaTaxService {
  minimumWageCheck(hourlyRate: number): MinimumWageResult {
    const compliant = hourlyRate >= MINIMUM_WAGE_HOURLY;
    return {
      compliant,
      minimumWage: MINIMUM_WAGE_HOURLY,
      shortfall: compliant ? null : Math.round((MINIMUM_WAGE_HOURLY - hourlyRate) * 100) / 100,
      overtimeRate: Math.round(MINIMUM_WAGE_HOURLY * OVERTIME_MULTIPLIER * 100) / 100,
    };
  }

  vatAssessment(annualTurnover: number): VatAssessmentResult {
    return {
      mustRegister: annualTurnover > VAT_REGISTRATION_THRESHOLD,
      canVoluntaryRegister: annualTurnover >= VAT_VOLUNTARY_THRESHOLD && annualTurnover <= VAT_REGISTRATION_THRESHOLD,
      threshold: VAT_REGISTRATION_THRESHOLD,
      voluntaryThreshold: VAT_VOLUNTARY_THRESHOLD,
    };
  }

  turnoverTaxEstimate(annualTurnover: number): TurnoverTaxResult {
    const eligible = annualTurnover <= VAT_REGISTRATION_THRESHOLD;

    const estimatedTax = (() => {
      if (annualTurnover <= TURNOVER_TAX_BRACKET_1) {
        return 0;
      } else if (annualTurnover <= TURNOVER_TAX_BRACKET_2) {
        return (annualTurnover - TURNOVER_TAX_BRACKET_1) * TURNOVER_TAX_RATE_1;
      } else if (annualTurnover <= TURNOVER_TAX_BRACKET_3) {
        return TURNOVER_TAX_BASE_2 + (annualTurnover - TURNOVER_TAX_BRACKET_2) * TURNOVER_TAX_RATE_2;
      } else if (annualTurnover <= VAT_REGISTRATION_THRESHOLD) {
        return TURNOVER_TAX_BASE_3 + (annualTurnover - TURNOVER_TAX_BRACKET_3) * TURNOVER_TAX_RATE_3;
      } else {
        return 0;
      }
    })();

    const effectiveRate =
      annualTurnover > 0 ? Math.round((estimatedTax / annualTurnover) * 10000) / 10000 : 0;

    return {
      eligible,
      estimatedTax: Math.round(estimatedTax * 100) / 100,
      effectiveRate,
    };
  }

  corporateTaxEstimate(taxableIncome: number): CorporateTaxResult {
    return {
      tax: Math.round(taxableIncome * CORPORATE_TAX_RATE * 100) / 100,
      rate: CORPORATE_TAX_RATE,
    };
  }

  sdlApplicable(annualPayroll: number): SdlResult {
    const applicable = annualPayroll > SDL_THRESHOLD;
    return {
      applicable,
      amount: applicable ? Math.round(annualPayroll * SDL_RATE * 100) / 100 : 0,
      threshold: SDL_THRESHOLD,
    };
  }

  uifCalculation(monthlyRemuneration: number): UifResult {
    const capped = monthlyRemuneration > UIF_CEILING;
    const base = capped ? UIF_CEILING : monthlyRemuneration;
    const employeeContribution = Math.round(base * UIF_RATE * 100) / 100;
    const employerContribution = Math.round(base * UIF_RATE * 100) / 100;
    return {
      employeeContribution,
      employerContribution,
      total: Math.round((employeeContribution + employerContribution) * 100) / 100,
      ceiling: UIF_CEILING,
      capped,
    };
  }

  taxCalendar(financialYearEndMonth: number): TaxCalendarEntry[] {
    const currentYear = now().year;

    const fyeMonth = financialYearEndMonth;
    const fyeYear = fyeMonth >= now().month ? currentYear : currentYear + 1;

    const provisionalFirst = `${fyeYear}-${String(fyeMonth + 6 > 12 ? fyeMonth + 6 - 12 : fyeMonth + 6).padStart(2, "0")}-28`;
    const provisionalSecond = `${fyeMonth <= 6 ? fyeYear : fyeYear + 1}-${String(fyeMonth).padStart(2, "0")}-28`;

    const emp201Dates = Array.from({ length: 12 }, (_, i) => {
      const month = i + 1;
      const year = month >= now().month ? currentYear : currentYear + 1;
      return {
        name: `EMP201 Monthly Declaration - ${String(month).padStart(2, "0")}/${year}`,
        date: `${year}-${String(month).padStart(2, "0")}-07`,
        type: "payroll",
        description: "Monthly PAYE, UIF, and SDL declaration and payment due",
      };
    });

    return [
      {
        name: "First Provisional Tax Payment",
        date: provisionalFirst,
        type: "income_tax",
        description: "First provisional tax payment (IRP6) due 6 months after financial year end",
      },
      {
        name: "Second Provisional Tax Payment",
        date: provisionalSecond,
        type: "income_tax",
        description: "Second provisional tax payment (IRP6) due at financial year end",
      },
      {
        name: "Company Income Tax Return (ITR14)",
        date: `${currentYear}-12-15`,
        type: "income_tax",
        description: "Annual company income tax return submission deadline",
      },
      ...emp201Dates,
      {
        name: "EMP501 Interim Reconciliation",
        date: `${currentYear}-10-31`,
        type: "payroll",
        description: "Interim employer reconciliation for March-August period",
      },
      {
        name: "EMP501 Annual Reconciliation",
        date: `${currentYear + 1}-05-31`,
        type: "payroll",
        description: "Annual employer reconciliation for full tax year",
      },
      {
        name: "VAT Return (bi-monthly)",
        date: "Every 25th of even months",
        type: "vat",
        description: "VAT201 return submission and payment due on the 25th of each even month",
      },
      {
        name: "COIDA Return of Earnings",
        date: `${currentYear}-03-31`,
        type: "labour",
        description: "Annual Return of Earnings submission to Compensation Fund",
      },
    ];
  }

  setaGrantInfo(): SetaGrantInfo {
    return {
      mandatoryGrant: {
        percentage: 20,
        description: "Automatically available if WSP/ATR submitted by 30 April",
      },
      discretionaryGrant: {
        percentage: "varies",
        description: "Application-based, depends on SETA priorities",
      },
      pivotalGrant: {
        percentage: "varies",
        description: "For professional/vocational/technical programmes",
      },
      deadlines: [
        { name: "Workplace Skills Plan (WSP)", date: "30 April annually" },
        { name: "Annual Training Report (ATR)", date: "30 April annually" },
      ],
      steps: [
        "Register with relevant SETA",
        "Submit WSP and ATR by 30 April",
        "Claim mandatory grant (20% of SDL paid)",
        "Apply for discretionary grants if eligible",
      ],
    };
  }
}
